---
layout: post
title: 视频转换
date: 2021-10-14
tags: [逆向开发]
---

## Life
工作需要热情，否则就只能是一个上下班的工具了，偶尔逆向一下，才会激情满满。

## 视频转换
逆向的动力来源于爱好，工作，或者某些政治任务，比如媳妇要转视频格式，关键还是一个特殊的格式，f4v。一顿google后，发现某捷的视频转换器挺好，于是很开心的下载下来想白嫖一下。因为之前的版本，是注册形式的，手里之前写过注册机。但是新版本是一个会员模式的，好吧，看来得磨练下技术了。

打开之后，点击转换，出现了这货，这不是搞事情么

![avatar](/images/pages/2021-10-14-moujie-video-converter/tips.png)

最喜欢的就是弹窗了，结果一看还是QT的

![avatar](/images/pages/2021-10-14-moujie-video-converter/dialogstack.png)

那这样就更好办了，这相当于就告诉了你，老子的关键逻辑就是在这里。那就ida看一下，逻辑是怎样的？

``` c++
BOOL __fastcall sub_5010A0(int a1, int a2, int a3)
{
  // 省略局部变量部分
  ...

  v3 = a1;
  if ( (unsigned __int8)sub_622F00() )
    return 1;
  v4 = *(_DWORD *)(v3 + 0x54);
  if ( !v4 )
    return 0;
  if ( (unsigned __int8)u_IsVipUser_4746C0(v4) )
    return 1;
  v68 = ZN10QArrayData11shared_nullE;
  v69 = ZN10QArrayData11shared_nullE;
  v70 = ZN10QArrayData11shared_nullE;
  ZNK11QMetaObject2trEPKcS1_i(&v71, v5, &off_DB6E38, "非VIP用户", 0);
  v67 = 3 * (a3 != 9) + 2;
  if ( !(unsigned __int8)sub_474630(*(_DWORD *)(v3 + 0x54)) )
  {
    ZNK11QMetaObject2trEPKcS1_i(&v72, v7, &off_DB6E38, "普通用户", 0);
    v41 = v71;
    v71 = v72;
    v72 = v41;
    sub_79DDE0((volatile signed __int32 **)&v72);
    v67 = 2;
  }
  switch ( a3 )
  {
    case 2:
      v28 = sub_4F4100(v3) != 0;
      goto LABEL_20;
    case 6:
      ZNK11QMetaObject2trEPKcS1_i(&v73, v7, &off_DB6E38, "%1只能截取一张图片，开通VIP无限制.", 0);
      v53 = v73;
      v73 = v68;
      v68 = v53;
      sub_79DDE0((volatile signed __int32 **)&v73);
      ZNK11QMetaObject2trEPKcS1_i(&v74, v54, &off_DB6E38, "继续(截取1张)", 0);
      v55 = v74;
      v74 = v69;
      v69 = v55;
      sub_79DDE0((volatile signed __int32 **)&v74);
      ZNK11QMetaObject2trEPKcS1_i(&v75, v56, &off_DB6E38, "开通VIP(连续截图)", 0);
      v57 = v70;
      v70 = v75;
      v75 = v57;
      sub_79DDE0((volatile signed __int32 **)&v75);
      break;
    case 9:
      ZNK11QMetaObject2trEPKcS1_i(
        &v76,
        v7,
        &off_DB6E38,
        "%1只能处理%2分钟以内的音频，开通VIP无限制.",
        0);
      v42 = v76;
      v76 = v68;
      v68 = v42;
      sub_79DDE0((volatile signed __int32 **)&v76);
      ZNK11QMetaObject2trEPKcS1_i(&v77, v43, &off_DB6E38, "继续", 0);
      v44 = v77;
      v77 = v69;
      v69 = v44;
      sub_79DDE0((volatile signed __int32 **)&v77);
      ZNK11QMetaObject2trEPKcS1_i(&v78, v45, &off_DB6E38, "开通VIP", 0);
      v46 = v70;
      v70 = v78;
      v78 = v46;
      sub_79DDE0((volatile signed __int32 **)&v78);
      break;
    default:
      ZNK11QMetaObject2trEPKcS1_i(
        &v79,
        v7,
        &off_DB6E38,
        "%1只能处理%2分钟以内的视频，并会额外加入水印，开通VIP无限制.",
        0);
      v8 = v79;
      v79 = v68;
      v68 = v8;
      sub_79DDE0((volatile signed __int32 **)&v79);
      ZNK11QMetaObject2trEPKcS1_i(&v80, v9, &off_DB6E38, "继续(有水印)", 0);
      v10 = v80;
      v80 = v69;
      v69 = v10;
      sub_79DDE0((volatile signed __int32 **)&v80);
      ZNK11QMetaObject2trEPKcS1_i(&v81, v11, &off_DB6E38, "开通VIP(无水印)", 0);
      v12 = v70;
      v70 = v81;
      v81 = v12;
      sub_79DDE0((volatile signed __int32 **)&v81);
      break;
  }
  v14 = *(_DWORD *)(v3 + 208);
  if ( v14 >= 0 && *(_DWORD *)(dword_EC55AC + 4) > v14 )
  {
    if ( v14 > 0 )
    {
      sub_79E230(&dword_EC55AC);
      v100 = *(_DWORD *)(*(_DWORD *)(dword_EC55AC + 12) + dword_EC55AC + 4 * v14);
      sub_7B76A0();
      sub_79DDA0(&v82, v15, "页面收银台");
      v18 = sub_49D680(v17, v16);
      sub_4A16F0(v18, (int)&v82, (int)&v82, (int)&v100);
      sub_79DDE0(&v82);
      sub_79DDE0((volatile signed __int32 **)&v100);
    }
    sub_79DDA0(&v83, v13, "开通VIP无限制弹窗");
    v19 = *(_DWORD *)(v3 + 208);
    sub_79E230(&dword_EC55AC);
    v100 = *(_DWORD *)(*(_DWORD *)(dword_EC55AC + 12) + dword_EC55AC + 4 * v19);
    sub_7B76A0();
    sub_49D680(v21, v20);
    sub_4A13A0(&v100, &v83);
    sub_79DDE0((volatile signed __int32 **)&v100);
    sub_79DDE0(&v83);
  }
  ZNK7QString3argERKS_i5QChar(&v84);
  ZNK7QString3argExii5QChar(&v85, v67 >> 31, &v84, v67, v67 >> 31);
  v22 = v68;
  v68 = v85;
  v85 = v22;
  sub_79DDE0((volatile signed __int32 **)&v85);
  sub_79DDE0((volatile signed __int32 **)&v84);
  ZNK11QMetaObject2trEPKcS1_i(&v87, v23, &off_DB6E38, "开通VIP无限制", 0);
  ZNK11QMetaObject2trEPKcS1_i(&v86, v24, &off_DB6E38, "提示", 0);
  sub_4577E0(&v68, &v86, &v87, &v70, &v69, 0);
  sub_79DDE0((volatile signed __int32 **)&v86);
  sub_79DDE0((volatile signed __int32 **)&v87);
  sub_61D430(&v100, v3, 0);
  ZN7QWidget14activateWindowEv(&v100, v25, v62, v63, v64);
  v26 = _ZN7QDialog4execEv(&v100);
  v27 = v26;
  if ( v26 )
  {
    if ( v26 == 1 )
    {
      v47 = *(_DWORD *)(v3 + 208);
      if ( v47 >= 0 && *(_DWORD *)(dword_EC55AC + 4) > v47 )
      {
        sub_79E230(&dword_EC55AC);
        v99 = *(_DWORD *)(*(_DWORD *)(dword_EC55AC + 12) + dword_EC55AC + 4 * v47);
        sub_7B76A0();
        sub_79DDA0(&v90, v48, "继续");
        sub_79DDA0(&v89, v49, &byte_82EEAF);
        sub_79DDA0(&v88, v50, "开通VIP无限制弹窗");
        sub_49D680(v52, v51);
        sub_4A0E70((int *)&v88, (int)&v89, (int *)&v90, (int)&v99);
        sub_79DDE0(&v88);
        sub_79DDE0(&v89);
        sub_79DDE0(&v90);
        sub_79DDE0((volatile signed __int32 **)&v99);
      }
      goto LABEL_19;
    }
    if ( v26 != 2 )
    {
LABEL_19:
      sub_4578D0(&v100);
      v28 = v27;
LABEL_20:
      v66 = v28;
      sub_79DDE0((volatile signed __int32 **)&v71);
      sub_79DDE0((volatile signed __int32 **)&v70);
      sub_79DDE0((volatile signed __int32 **)&v69);
      sub_79DDE0((volatile signed __int32 **)&v68);
      return v66;
    }
    v29 = *(_DWORD *)(v3 + 208);
    if ( v29 >= 0 && v29 < *(_DWORD *)(dword_EC55AC + 4) )
    {
      sub_79E230(&dword_EC55AC);
      v99 = *(_DWORD *)(*(_DWORD *)(dword_EC55AC + 12) + dword_EC55AC + 4 * v29);
      sub_7B76A0();
      sub_79DDA0(&v93, v30, "开通VIP");
      sub_79DDA0(&v92, v31, &byte_82EEAF);
      sub_79DDA0(&v91, v32, "开通VIP无限制弹窗");
      sub_49D680(v34, v33);
      sub_4A0E70((int *)&v91, (int)&v92, (int *)&v93, (int)&v99);
      sub_79DDE0(&v91);
      sub_79DDE0(&v92);
      sub_79DDE0(&v93);
      sub_79DDE0((volatile signed __int32 **)&v99);
    }
    v35 = sub_474630(*(_DWORD *)(v3 + 84));
    v65 = *(_DWORD *)(v3 + 84);
    if ( v35 )
    {
      sub_474AD0((volatile signed __int32 **)&v97, v36, v65);
      sub_79DDA0(&v99, v58, "弹出");
      sub_79DDA0(&v98, v59, "PayTransition");
      sub_49D680(v61, v60);
      sub_4A0120(&v98, &v99, &v97);
      sub_79DDE0(&v98);
      sub_79DDE0((volatile signed __int32 **)&v99);
      sub_79DDE0((volatile signed __int32 **)&v97);
    }
    else
    {
      sub_474AD0((volatile signed __int32 **)&v94, v36, v65);
      sub_79DDA0(&v96, v37, "弹出");
      sub_79DDA0(&v95, v38, "LoginTransition");
      sub_49D680(v40, v39);
      sub_4A0120(&v95, &v96, &v94);
      sub_79DDE0(&v95);
      sub_79DDE0(&v96);
      sub_79DDE0((volatile signed __int32 **)&v94);
    }
    sub_500A60(1);
  }
  v27 = 0;
  goto LABEL_19;
}
```

这个函数 u_IsVipUser_4746C0（原函数名是sub_4746c0,我自己分析完后备注的） 这分明就是说，前面新进行了是否是vip的判断，不是vip那就弹个窗，

``` c++
int __fastcall u_IsVipUser_4746C0(int a1)
{
  int v1; // ebx
  int result; // eax

  v1 = a1;
  if ( !(_BYTE)byte_814DB0 && _cxa_guard_acquire(&byte_814DB0) )
  {
    nullsub_14(&unk_814DF8);
    _cxa_guard_release(&byte_814DB0);
    sub_5AAB20(sub_474440);
  }
  result = sub_622F00();
  if ( !(_BYTE)result )
    result = *(unsigned __int8 *)(v1 + 2);
  return result;
}
```

那要是这个函数返回了1，会咋样呢。果然有奇效，本来想把通信协议给搞了的，但是害怕，还是算了。直接patch了吧，于是一个绿色版就产生了。


原来逆向才是我的最爱！！！


