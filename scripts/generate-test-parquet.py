from pathlib import Path
import struct

# Minimal Parquet fixture generator. Most specialized fixtures remain schema-only for focused schema regression,
# while before.parquet / after.parquet include real rows so the optional first-10-row preview can be exercised.
STOP=0; TRUE=1; FALSE=2; BYTE=3; I16=4; I32=5; I64=6; DOUBLE=7; BINARY=8; LIST=9; STRUCT=12

PARQUET_TYPES={
    'BOOLEAN':0,'INT32':1,'INT64':2,'INT96':3,'FLOAT':4,'DOUBLE':5,'BYTE_ARRAY':6,'FIXED_LEN_BYTE_ARRAY':7
}
CONVERTED_TYPES={
    'UTF8':0,'MAP':1,'MAP_KEY_VALUE':2,'LIST':3,'ENUM':4,'DECIMAL':5,'DATE':6,'TIME_MILLIS':7,'TIME_MICROS':8,
    'TIMESTAMP_MILLIS':9,'TIMESTAMP_MICROS':10,'UINT_8':11,'UINT_16':12,'UINT_32':13,'UINT_64':14,
    'INT_8':15,'INT_16':16,'INT_32':17,'INT_64':18,'JSON':19,'BSON':20,'INTERVAL':21
}
REPETITION={'REQUIRED':0,'OPTIONAL':1,'REPEATED':2}

def varint(n):
    out=bytearray()
    while True:
        b=n&0x7f; n >>= 7
        if n: out.append(b|0x80)
        else: out.append(b); return bytes(out)

def zigzag(n): return (n<<1) ^ (n>>63)

def field_header(fid,last,type_):
    delta=fid-last
    if 1<=delta<=15: return bytes([(delta<<4)|type_]),fid
    return bytes([type_])+varint(zigzag(fid)),fid

def i32_field(fid,last,value):
    h,last=field_header(fid,last,I32); return h+varint(zigzag(value)),last

def i64_field(fid,last,value):
    h,last=field_header(fid,last,I64); return h+varint(zigzag(value)),last

def byte_field(fid,last,value):
    h,last=field_header(fid,last,BYTE); return h+struct.pack('b',value),last

def bool_field(fid,last,value):
    h,last=field_header(fid,last,TRUE if value else FALSE); return h,last

def bin_field(fid,last,value):
    data=value.encode(); h,last=field_header(fid,last,BINARY); return h+varint(len(data))+data,last

def struct_field(fid,last,content):
    h,last=field_header(fid,last,STRUCT); return h+content,last

def list_field(fid,last,items):
    h,last=field_header(fid,last,LIST)
    size=len(items); payload=bytes([(size<<4)|STRUCT]) if size<15 else bytes([0xf0|STRUCT])+varint(size)
    return h+payload+b''.join(items),last

def empty_struct(): return bytes([STOP])

def logical_type(kind, **kwargs):
    # LogicalType union fields from parquet.thrift.
    field_ids={'STRING':1,'MAP':2,'LIST':3,'ENUM':4,'DECIMAL':5,'DATE':6,'TIME':7,'TIMESTAMP':8,'INTEGER':10,'NULL':11,'JSON':12,'BSON':13,'UUID':14,'FLOAT16':15}
    fid=field_ids[kind]
    if kind=='DECIMAL':
        b=bytearray(); last=0
        x,last=i32_field(1,last,kwargs['scale']); b+=x
        x,last=i32_field(2,last,kwargs['precision']); b+=x
        b.append(STOP); content=bytes(b)
    elif kind in ('TIME','TIMESTAMP'):
        b=bytearray(); last=0
        x,last=bool_field(1,last,kwargs.get('adjusted',False)); b+=x
        unit_kind=kwargs.get('unit','MICROS')
        unit_id={'MILLIS':1,'MICROS':2,'NANOS':3}[unit_kind]
        unit_union=bytearray(); ul=0
        x,ul=struct_field(unit_id,ul,empty_struct()); unit_union+=x; unit_union.append(STOP)
        x,last=struct_field(2,last,bytes(unit_union)); b+=x
        b.append(STOP); content=bytes(b)
    elif kind=='INTEGER':
        b=bytearray(); last=0
        x,last=byte_field(1,last,kwargs.get('bit_width',32)); b+=x
        x,last=bool_field(2,last,kwargs.get('signed',True)); b+=x
        b.append(STOP); content=bytes(b)
    else:
        content=empty_struct()
    union=bytearray(); last=0
    x,last=struct_field(fid,last,content); union+=x; union.append(STOP)
    return bytes(union)

def schema_element(name, *, physical=None, repetition='OPTIONAL', children=None, converted=None,
                   scale=None, precision=None, field_id=None, logical=None, type_length=None):
    b=bytearray(); last=0
    if physical is not None:
        x,last=i32_field(1,last,PARQUET_TYPES[physical]); b+=x
    if type_length is not None:
        x,last=i32_field(2,last,type_length); b+=x
    x,last=i32_field(3,last,REPETITION[repetition]); b+=x
    x,last=bin_field(4,last,name); b+=x
    if children is not None:
        x,last=i32_field(5,last,len(children)); b+=x
    if converted is not None:
        x,last=i32_field(6,last,CONVERTED_TYPES[converted]); b+=x
    if scale is not None:
        x,last=i32_field(7,last,scale); b+=x
    if precision is not None:
        x,last=i32_field(8,last,precision); b+=x
    if field_id is not None:
        x,last=i32_field(9,last,field_id); b+=x
    if logical is not None:
        kind,kw=logical
        x,last=struct_field(10,last,logical_type(kind,**kw)); b+=x
    b.append(STOP)
    return bytes(b)

def leaf(name, physical, **kw): return {'name':name,'physical':physical,**kw}
def group(name, children, **kw): return {'name':name,'children':children,**kw}

def encode_node(node):
    children=node.get('children')
    elem=schema_element(
        node['name'],physical=node.get('physical'),repetition=node.get('repetition','OPTIONAL'),children=children,
        converted=node.get('converted'),scale=node.get('scale'),precision=node.get('precision'),field_id=node.get('field_id'),
        logical=node.get('logical'),type_length=node.get('type_length'))
    out=[elem]
    if children:
        for child in children: out.extend(encode_node(child))
    return out

def make(path,nodes,padding=0):
    schemas=[schema_element('schema',repetition='REQUIRED',children=nodes)]
    for node in nodes: schemas.extend(encode_node(node))
    b=bytearray(); last=0
    x,last=i32_field(1,last,1); b+=x
    x,last=list_field(2,last,schemas); b+=x
    x,last=i64_field(3,last,0); b+=x
    x,last=list_field(4,last,[]); b+=x
    x,last=bin_field(6,last,'schema-diff-fixture-v0.3'); b+=x
    b.append(STOP)
    meta=bytes(b)
    payload=b'PAR1'+(b'\0'*padding)+meta+struct.pack('<I',len(meta))+b'PAR1'
    Path(path).write_bytes(payload)


# Compact primitive row writer used by the main Before / After fixtures.
PARQUET_ENCODINGS={'PLAIN':0,'RLE':3}
PARQUET_CODECS={'UNCOMPRESSED':0}

def list_i32_field(fid,last,items):
    h,last=field_header(fid,last,LIST)
    size=len(items); payload=bytes([(size<<4)|I32]) if size<15 else bytes([0xf0|I32])+varint(size)
    return h+payload+b''.join(varint(zigzag(v)) for v in items),last

def list_binary_field(fid,last,items):
    h,last=field_header(fid,last,LIST)
    size=len(items); payload=bytearray(bytes([(size<<4)|BINARY]) if size<15 else bytes([0xf0|BINARY])+varint(size))
    for value in items:
        data=value.encode(); payload+=varint(len(data))+data
    return h+bytes(payload),last

def data_page_header(num_values,payload_len):
    d=bytearray(); last=0
    x,last=i32_field(1,last,num_values); d+=x
    x,last=i32_field(2,last,PARQUET_ENCODINGS['PLAIN']); d+=x
    x,last=i32_field(3,last,PARQUET_ENCODINGS['RLE']); d+=x
    x,last=i32_field(4,last,PARQUET_ENCODINGS['RLE']); d+=x
    d.append(STOP)
    h=bytearray(); last=0
    x,last=i32_field(1,last,0); h+=x  # DATA_PAGE
    x,last=i32_field(2,last,payload_len); h+=x
    x,last=i32_field(3,last,payload_len); h+=x
    x,last=struct_field(5,last,bytes(d)); h+=x
    h.append(STOP)
    return bytes(h)

def definition_levels_all_present(count):
    body=varint(count<<1)+b'\x01'
    return struct.pack('<I',len(body))+body

def plain_values(physical,values):
    out=bytearray()
    if physical=='INT32':
        for value in values: out+=struct.pack('<i',int(value))
    elif physical=='INT64':
        for value in values: out+=struct.pack('<q',int(value))
    elif physical=='DOUBLE':
        for value in values: out+=struct.pack('<d',float(value))
    elif physical=='BYTE_ARRAY':
        for value in values:
            data=str(value).encode(); out+=struct.pack('<I',len(data))+data
    else:
        raise ValueError(f'preview fixture type not supported: {physical}')
    return bytes(out)

def column_metadata(node,count,total_size,data_offset):
    b=bytearray(); last=0
    x,last=i32_field(1,last,PARQUET_TYPES[node['physical']]); b+=x
    x,last=list_i32_field(2,last,[PARQUET_ENCODINGS['PLAIN'],PARQUET_ENCODINGS['RLE']]); b+=x
    x,last=list_binary_field(3,last,[node['name']]); b+=x
    x,last=i32_field(4,last,PARQUET_CODECS['UNCOMPRESSED']); b+=x
    x,last=i64_field(5,last,count); b+=x
    x,last=i64_field(6,last,total_size); b+=x
    x,last=i64_field(7,last,total_size); b+=x
    x,last=i64_field(9,last,data_offset); b+=x
    b.append(STOP)
    return bytes(b)

def column_chunk(meta):
    b=bytearray(); last=0
    x,last=i64_field(2,last,0); b+=x
    x,last=struct_field(3,last,meta); b+=x
    b.append(STOP)
    return bytes(b)

def row_group(chunks,total_size,count,first_offset):
    b=bytearray(); last=0
    x,last=list_field(1,last,chunks); b+=x
    x,last=i64_field(2,last,total_size); b+=x
    x,last=i64_field(3,last,count); b+=x
    x,last=i64_field(5,last,first_offset); b+=x
    x,last=i64_field(6,last,total_size); b+=x
    b.append(STOP)
    return bytes(b)

def make_rows(path,nodes,rows,padding=0):
    if any(node.get('children') for node in nodes):
        raise ValueError('make_rows currently supports top-level primitive fixture columns only')
    count=len(rows)
    schemas=[schema_element('schema',repetition='REQUIRED',children=nodes)]
    for node in nodes: schemas.extend(encode_node(node))
    data_parts=[]; chunks=[]; offset=4
    for node in nodes:
        values=[row[node['name']] for row in rows]
        if any(value is None for value in values):
            raise ValueError('main preview fixtures intentionally use non-null values')
        levels=definition_levels_all_present(count) if node.get('repetition','OPTIONAL')!='REQUIRED' else b''
        payload=levels+plain_values(node['physical'],values)
        page=data_page_header(count,len(payload))+payload
        chunks.append(column_chunk(column_metadata(node,count,len(page),offset)))
        data_parts.append(page); offset+=len(page)
    group=row_group(chunks,sum(map(len,data_parts)),count,4)
    b=bytearray(); last=0
    x,last=i32_field(1,last,1); b+=x
    x,last=list_field(2,last,schemas); b+=x
    x,last=i64_field(3,last,count); b+=x
    x,last=list_field(4,last,[group]); b+=x
    x,last=bin_field(6,last,'schema-diff-fixture-v0.8.3'); b+=x
    b.append(STOP)
    meta=bytes(b)
    payload=b'PAR1'+b''.join(data_parts)+(b'\0'*padding)+meta+struct.pack('<I',len(meta))+b'PAR1'
    Path(path).write_bytes(payload)

string=lambda name,**kw: leaf(name,'BYTE_ARRAY',logical=('STRING',{}),**kw)
decimal=lambda name,precision,scale,**kw: leaf(name,'INT64',logical=('DECIMAL',{'precision':precision,'scale':scale}),precision=precision,scale=scale,**kw)
timestamp=lambda name,adjusted=True,unit='MICROS',**kw: leaf(name,'INT64',logical=('TIMESTAMP',{'unit':unit,'adjusted':adjusted}),**kw)

def list_of(name, element, **kw):
    return group(name,[group('list',[element],repetition='REPEATED')],logical=('LIST',{}),converted='LIST',**kw)

def map_of(name,key,value,**kw):
    return group(name,[group('key_value',[key,value],repetition='REPEATED',converted='MAP_KEY_VALUE')],logical=('MAP',{}),converted='MAP',**kw)

before_nodes=[
    group('customer',[
        leaf('id','INT64',repetition='REQUIRED',field_id=2),
        string('email',repetition='OPTIONAL',field_id=3),
        decimal('balance',12,2,repetition='OPTIONAL',field_id=4),
    ],repetition='OPTIONAL',field_id=1),
    list_of('tags',string('element',repetition='OPTIONAL',field_id=6),repetition='OPTIONAL',field_id=5),
    map_of('attributes',string('key',repetition='REQUIRED',field_id=8),string('value',repetition='OPTIONAL',field_id=9),repetition='OPTIONAL',field_id=7),
    timestamp('created_at',repetition='REQUIRED',field_id=10),
    group('preferences',[string('theme',repetition='OPTIONAL',field_id=13)],repetition='OPTIONAL',field_id=12),
]

after_nodes=[
    group('customer',[
        leaf('id','INT64',repetition='OPTIONAL',field_id=2), # nullability
        string('email',repetition='OPTIONAL',field_id=3),
        decimal('balance',14,3,repetition='OPTIONAL',field_id=4), # decimal
        string('country',repetition='OPTIONAL',field_id=11), # nested added
    ],repetition='OPTIONAL',field_id=1),
    list_of('tags',leaf('element','INT32',repetition='OPTIONAL',field_id=6),repetition='OPTIONAL',field_id=5), # nested type
    map_of('attributes',string('key',repetition='REQUIRED',field_id=8),string('value',repetition='OPTIONAL',field_id=19),repetition='OPTIONAL',field_id=7), # field id
    timestamp('created_at',repetition='REQUIRED',field_id=10),
    list_of('preferences',string('element',repetition='OPTIONAL',field_id=13),repetition='OPTIONAL',field_id=12), # STRUCT -> LIST
]



compat_before_nodes=[
    leaf('customer_id','INT32',repetition='REQUIRED',field_id=101),
    string('customer_name',repetition='OPTIONAL',field_id=102),
    string('legacy_code',repetition='OPTIONAL',field_id=103),
    string('status',repetition='OPTIONAL',field_id=104),
    leaf('score','DOUBLE',repetition='OPTIONAL',field_id=105),
    decimal('price',12,2,repetition='OPTIONAL',field_id=106),
    decimal('tax',10,2,repetition='OPTIONAL',field_id=107),
    timestamp('created_at',adjusted=False,repetition='REQUIRED',field_id=108),
    string('external_ref',repetition='OPTIONAL',field_id=109),
]

compat_after_nodes=[
    leaf('customer_id','INT64',repetition='REQUIRED',field_id=101), # widening
    string('name',repetition='OPTIONAL',field_id=102), # rename by Field ID
    string('status',repetition='REQUIRED',field_id=104), # optional -> required
    leaf('score','FLOAT',repetition='OPTIONAL',field_id=105), # narrowing
    decimal('price',10,2,repetition='OPTIONAL',field_id=106), # precision down
    decimal('tax',12,3,repetition='OPTIONAL',field_id=107), # scale change
    timestamp('created_at',adjusted=True,repetition='REQUIRED',field_id=108), # timestamp semantics
    string('external_ref',repetition='OPTIONAL',field_id=119), # Field ID changed
    string('country',repetition='OPTIONAL',field_id=110), # optional add
    string('tenant_id',repetition='REQUIRED',field_id=111), # required add
]



duplicate_id_before=[
    string('old_a',field_id=200),
    string('old_b',field_id=200),
]
duplicate_id_after=[
    string('new_a',field_id=200),
    string('new_b',field_id=200),
]

root=Path(__file__).resolve().parent.parent/'test-data'; root.mkdir(exist_ok=True)
before_main=[leaf('customer_id','INT32',repetition='OPTIONAL'),string('name'),leaf('amount','DOUBLE')]
after_main=[leaf('customer_id','INT64',repetition='OPTIONAL'),string('name'),string('country')]
main_rows_before=[{'customer_id':1000+i,'name':f'Customer {i}','amount':10.5*i} for i in range(1,13)]
countries=['JP','US','GB','DE','FR','CA','AU','SG','JP','US','GB','DE']
main_rows_after=[{'customer_id':1000+i,'name':f'Customer {i}','country':countries[i-1]} for i in range(1,13)]
make_rows(root/'before.parquet',before_main,main_rows_before,padding=2*1024*1024)
make_rows(root/'after.parquet',after_main,main_rows_after,padding=2*1024*1024)
make(root/'nested-before.parquet',before_nodes,padding=2*1024*1024)
make(root/'nested-after.parquet',after_nodes,padding=2*1024*1024)
make(root/'compat-before.parquet',compat_before_nodes,padding=2*1024*1024)
make(root/'compat-after.parquet',compat_after_nodes,padding=2*1024*1024)
make(root/'duplicate-id-before.parquet',duplicate_id_before,padding=0)
make(root/'duplicate-id-after.parquet',duplicate_id_after,padding=0)

# Cross-format nested fixture with JSON-compatible logical types.
cross_nested_nodes=[
    group('profile',[
        string('email',repetition='OPTIONAL'),
        leaf('age','INT32',repetition='OPTIONAL'),
    ],repetition='OPTIONAL'),
    list_of('tags',string('element',repetition='OPTIONAL'),repetition='OPTIONAL'),
    leaf('active','BOOLEAN',repetition='REQUIRED'),
    leaf('score','DOUBLE',repetition='OPTIONAL'),
]
make(root/'cross-nested.parquet',cross_nested_nodes,padding=2*1024*1024)

cross_temporal_nodes=[
    leaf('event_date','INT32',repetition='OPTIONAL',logical=('DATE',{}),converted='DATE'),
    timestamp('event_at',adjusted=True,unit='MICROS',repetition='OPTIONAL'),
    leaf('amount','DOUBLE',repetition='OPTIONAL'),
]
make(root/'cross-temporal.parquet',cross_temporal_nodes,padding=2*1024*1024)

print(root)

# Regression fixture for v0.8.3: dictionary-encoded DECIMAL values. This specifically
# covers the preview double-conversion bug that attempted BigInt("0.0000").
def dictionary_page_header(num_values,payload_len):
    d=bytearray(); last=0
    x,last=i32_field(1,last,num_values); d+=x
    x,last=i32_field(2,last,PARQUET_ENCODINGS['PLAIN']); d+=x
    d.append(STOP)
    h=bytearray(); last=0
    x,last=i32_field(1,last,2); h+=x  # DICTIONARY_PAGE
    x,last=i32_field(2,last,payload_len); h+=x
    x,last=i32_field(3,last,payload_len); h+=x
    x,last=struct_field(7,last,bytes(d)); h+=x
    h.append(STOP)
    return bytes(h)

def data_page_header_encoding(num_values,payload_len,encoding):
    d=bytearray(); last=0
    x,last=i32_field(1,last,num_values); d+=x
    x,last=i32_field(2,last,encoding); d+=x
    x,last=i32_field(3,last,PARQUET_ENCODINGS['RLE']); d+=x
    x,last=i32_field(4,last,PARQUET_ENCODINGS['RLE']); d+=x
    d.append(STOP)
    h=bytearray(); last=0
    x,last=i32_field(1,last,0); h+=x  # DATA_PAGE
    x,last=i32_field(2,last,payload_len); h+=x
    x,last=i32_field(3,last,payload_len); h+=x
    x,last=struct_field(5,last,bytes(d)); h+=x
    h.append(STOP)
    return bytes(h)

def make_dictionary_decimal(path):
    node=decimal('amount',precision=12,scale=4,repetition='OPTIONAL')
    schemas=[schema_element('schema',repetition='REQUIRED',children=[node]),*encode_node(node)]
    raw_dictionary=[0,123400,-5000]
    dictionary_payload=plain_values('INT64',raw_dictionary)
    dictionary_page=dictionary_page_header(len(raw_dictionary),len(dictionary_payload))+dictionary_payload
    indices=[0,1,2,0,1,2,0,1,2,0,1,2]
    # optional field, all present; RLE_DICTIONARY begins with bit width then hybrid runs
    levels=definition_levels_all_present(len(indices))
    index_payload=bytes([2])+b''.join(bytes([2,index]) for index in indices)
    data_payload=levels+index_payload
    data_page=data_page_header_encoding(len(indices),len(data_payload),8)+data_payload
    data_offset=4+len(dictionary_page)
    dict_offset=4
    total_size=len(dictionary_page)+len(data_page)
    meta_col=bytearray(); last=0
    x,last=i32_field(1,last,PARQUET_TYPES['INT64']); meta_col+=x
    x,last=list_i32_field(2,last,[PARQUET_ENCODINGS['PLAIN'],PARQUET_ENCODINGS['RLE'],8]); meta_col+=x
    x,last=list_binary_field(3,last,['amount']); meta_col+=x
    x,last=i32_field(4,last,PARQUET_CODECS['UNCOMPRESSED']); meta_col+=x
    x,last=i64_field(5,last,len(indices)); meta_col+=x
    x,last=i64_field(6,last,total_size); meta_col+=x
    x,last=i64_field(7,last,total_size); meta_col+=x
    x,last=i64_field(9,last,data_offset); meta_col+=x
    x,last=i64_field(11,last,dict_offset); meta_col+=x
    meta_col.append(STOP)
    chunk=column_chunk(bytes(meta_col))
    group=row_group([chunk],total_size,len(indices),dict_offset)
    b=bytearray(); last=0
    x,last=i32_field(1,last,1); b+=x
    x,last=list_field(2,last,schemas); b+=x
    x,last=i64_field(3,last,len(indices)); b+=x
    x,last=list_field(4,last,[group]); b+=x
    x,last=bin_field(6,last,'schema-diff-decimal-dictionary-v0.8.3'); b+=x
    b.append(STOP)
    meta=bytes(b)
    Path(path).write_bytes(b'PAR1'+dictionary_page+data_page+meta+struct.pack('<I',len(meta))+b'PAR1')

make_dictionary_decimal(root/'decimal-dictionary.parquet')
print(root/'decimal-dictionary.parquet')

# Logical INTEGER width/sign coverage, paired with the legacy converted types.
integer_nodes=[]
converted_integer_nodes=[]
for bits in (8,16,32,64):
    for signed in (True,False):
        prefix='int' if signed else 'uint'
        physical='INT32' if bits<=32 else 'INT64'
        integer_nodes.append(leaf(f'{prefix}{bits}',physical,
                                  logical=('INTEGER',{'bit_width':bits,'signed':signed})))
        converted_integer_nodes.append(leaf(f'{prefix}{bits}',physical,
                                            converted=f'{prefix.upper()}_{bits}'))
make(root/'integer-logical.parquet',integer_nodes)
make(root/'integer-converted.parquet',converted_integer_nodes)

# A rename can also change type/nullability; view filters must not hide it.
make(root/'rename-filter-before.parquet',[
    leaf('old_name','INT32',field_id=101),
    leaf('stable','INT32',field_id=102),
    leaf('removed','INT32',field_id=103),
])
make(root/'rename-filter-after.parquet',[
    leaf('new_name','INT64',field_id=101,repetition='REQUIRED'),
    leaf('stable','INT32',field_id=102),
    leaf('added','INT32',field_id=104),
])
