---
layout: post
title: 解密Sqlite数据库
date: 2024-06-06
tags: 逆向开发
---

## Life
好久没写文章，因为好久没做技术研究，未来可能更多的会转向其它方面的研究。

## 思路
不管研究什么东西，切入的思路是很重要的。就比如sqlite，如果你连怎么加密都不知道，更何谈解密，以及找到密码呢。

## 参考代码
https://github.com/rindeal/SQLite3-Encryption

## 如何解密？
```c++
    sqlite3 *pDb = NULL;
    int status = sqlite3_open("d:\\1.db", &pDb);
    
    // 设置数据库的密码
    status = sqlite3_key(pDb, "decrypt_key", 11);
    
    // 清除密码
    status = sqlite3_rekey(pDb, NULL, 0);
    sqlite3_close(pDb);
```
上面这段代码就是一个完整的设置密码，并解密的过程，我们的目的是拿到解密的密码，所以最关键的函数就是 sqlite3_key 这个函数，

```c++
int sqlite3_key(sqlite3 *db, const void *zKey, int nKey)
{
  /* The key is only set for the main database, not the temp database  */
  return sqlite3_key_v2(db, "main", zKey, nKey);
}

int sqlite3_key_v2(sqlite3 *db, const char *zDbName, const void *zKey, int nKey)
{
  /* The key is only set for the main database, not the temp database  */
  int dbIndex = dbFindIndex(db, zDbName);
  return sqlite3CodecAttach(db, dbIndex, zKey, nKey);
}
```

那么故事的主角 sqlite3CodecAttach 这个函数就要登场了。通过 sqlite3CodecAttach 的引用分析可以看到 这么一处的关键代码
```c++
#ifdef SQLITE_HAS_CODEC
  if( rc==SQLITE_OK ){
    extern int sqlite3CodecAttach(sqlite3*, int, const void*, int);
    extern void sqlite3CodecGetKey(sqlite3*, int, void**, int*);
    int nKey;
    char *zKey;
    int t = sqlite3_value_type(argv[2]);
    switch( t ){
      case SQLITE_INTEGER:
      case SQLITE_FLOAT:
        zErrDyn = sqlite3DbStrDup(db, "Invalid key value");
        rc = SQLITE_ERROR;
        break;
        
      case SQLITE_TEXT:
      case SQLITE_BLOB:
        nKey = sqlite3_value_bytes(argv[2]);
        zKey = (char *)sqlite3_value_blob(argv[2]);
        rc = sqlite3CodecAttach(db, db->nDb-1, zKey, nKey);
        break;

      case SQLITE_NULL:
        /* No key specified.  Use the key from the main database */
        sqlite3CodecGetKey(db, 0, (void**)&zKey, &nKey);
        if( nKey>0 || sqlite3BtreeGetOptimalReserve(db->aDb[0].pBt)>0 ){
          rc = sqlite3CodecAttach(db, db->nDb-1, zKey, nKey);
        }
        break;
    }
  }
#endif
```
在 SQLITE_BLOB 类别 和 SQLITE_NULL 下面都能看到关键函数 sqlite3CodecAttach 调用，那么说到这里，其实就是如何找 sqlite3CodecAttach 这个函数的过程，到这里你大概已经知道第一种方法了。

## 第二种方法
那么在深究一下，毕竟上面的特征还是很容易就被河蟹的。 这段代码所在的函数是 attachFunc 。 通过查看 attachFunc 这个函数的引用方式，能发现下面这段代码
```c++
/*
** Called by the parser to compile an ATTACH statement.
**
**     ATTACH p AS pDbname KEY pKey
*/
SQLITE_PRIVATE void sqlite3Attach(Parse *pParse, Expr *p, Expr *pDbname, Expr *pKey){
  static const FuncDef attach_func = {
    3,                /* nArg */
    SQLITE_UTF8,      /* funcFlags */
    0,                /* pUserData */
    0,                /* pNext */
    attachFunc,       /* xFunc */
    0,                /* xStep */
    0,                /* xFinalize */
    "sqlite_attach",  /* zName */
    0,                /* pHash */
    0                 /* pDestructor */
  };
  codeAttach(pParse, SQLITE_ATTACH, &attach_func, p, p, pDbname, pKey);
}
```

## 第 N 种特征
又一个特征来了，如果还被河蟹呢， 那就再向上引用一波
```c++

    ...... 代码省略 ......

{
  sqlite3DropTrigger(pParse,yymsp[0].minor.yy65,yymsp[-1].minor.yy328);
}
        break;
      case 295: /* cmd ::= ATTACH database_kw_opt expr AS expr key_opt */
{
  sqlite3Attach(pParse, yymsp[-3].minor.yy346.pExpr, yymsp[-1].minor.yy346.pExpr, yymsp[0].minor.yy132);
}
        break;
      case 296: /* cmd ::= DETACH database_kw_opt expr */
{
  sqlite3Detach(pParse, yymsp[0].minor.yy346.pExpr);
}
        break;

    ...... 代码省略 ......

```

如果还能被河蟹，那就再引用被，反正函数调用关系你不能给乱掉吧。 那么说到最后，就是要定位 sqlite3CodecAttach 这个函数的第三个，第四个参数。

理论说完了，那就拿聊天软件实战一波。你看，一丢丢都不带差的。
```c++
switch ( byte_184EA6430[*(_WORD *)(a3[2] + 8i64) & 0x1F] )
  {
    case 1:
    case 2:
      v119 = (char *)sub_183A8B210(v6, 18i64);
      if ( v119 )
        strcpy(v119, "Invalid key value");
      v129 = v119;
      v18 = 1;
      break;
    case 3:
    case 4:
      v116 = sub_183ABEDF0(a3[2]);
      v118 = sub_183ABEDA0(a3[2], v117);
      v18 = u_sqlite3CodecAttach(v6, *(_DWORD *)(v6 + 40) - 1, v118, v116);
      break;
    case 5:
```

## 恁说啥？
恁说啥？ 有密码不会解密？ 额。。。。。找下这个函数吧，只能帮你到这里了，
```c++
    sqlite3PagerSetCodec
```

## End
成果就不展示了，出于技术攻防的目的，就这么多吧，毕竟有追求的厂商，还是愿意更换加解密的方式的。就比如 信信
