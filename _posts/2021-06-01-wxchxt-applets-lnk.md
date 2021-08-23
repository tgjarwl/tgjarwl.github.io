---
layout: post
title: 某信创建小程序快捷方式
date: 2021-06-01
tags: 逆向开发
---

## Life
在某一个行业或者公司呆久了，我们总是会遇见一个瓶颈，唯一能帮助我们的就是自我的努力学习。自强者恒强，而不是幻想！

## 概述
WX的最新版中，增加了在桌面添加WX小程序的功能，该功能可以很方便的打开WX中的小程序。添加后会在桌面生成小程序的快捷方式。但是通过自己手工添加的方式，是无法在WX中直接打开的。经分析后，发现WX把添加过的小程序，保存到了配置文件中。
该文件是一个aes加密后的文件。每次当用户点击快捷方式后，WX会比对下配置文件中的数据，如果是WX添加的则启动，不是则提示用户快捷方式启动失败，需要用户再次添加一下。

## lnk文件创建逻辑
创建逻辑分为4个步骤，<font color="red">其中最关键的是修改配置文件，也就是说，只要配置文件中有纪录，则该小程序的快捷方式就能直接打开。否则，则打不开</font>
```
生成lnk文件
创建注册表项
保存到数据库
修改配置文件
```

打开小程序后，右上角三个点，可以弹出创建快捷方式的菜单

![avatar](/images/pages/2021_6_1_wx_applet_lnk/applet-new.png)

添加后会在桌面生成对应小程序的快捷方式，快捷方式中会包含要打开的小程序的唯一id

![avatar](/images/pages/2021_6_1_wx_applet_lnk/applet-lnk.png)

快捷方式添加完后，会在注册表中添加相应的纪录

![avatar](/images/pages/2021_6_1_wx_applet_lnk/applet-reg-pos.png)

之后会把数据在数据库中也备份一次

![avatar](/images/pages/2021_6_1_wx_applet_lnk/applet-write-db.png)

数据库表为
```
SELECT * FROM DesktopApps WHERE Key = ?1
```

最后，最关键的一步就是修改配置文件，写入的内容是aes加密后的小程序id。

![avatar](/images/pages/2021_6_1_wx_applet_lnk/applet-aes-db.png)

## 目标
需要绕过WX添加小程序快捷方式的限制。于是，分析和拆解最关键的配置文件加解密逻辑，达到我们也可以添加的目的。经过实验，发现只要修改最后面的配置文件即可达到目的。故重点关注下如何在配置里面添加要推广的小程序。

## 涉及到的文件
wxchxtwxn.dll
WX中的大部分操作都是通过wxchxtwxn.dll进行，所以该文件特别的大。

## 在配置文件中添加小程序id
在写入配置文件前，WX会先读取配置文件中的数据

![avatar](/images/pages/2021_6_1_wx_applet_lnk/applet-read-conf.png)


![avatar](/images/pages/2021_6_1_wx_applet_lnk/applet-read-conf-2.png)

读取文件后会需要对数据进行解密，经过分析，发现aes的key是从设备id来的。先看下如何取设备id。

### 设备id
WX的设备id是通过硬件的参数生成的，生成后，会保存到配置文件中，方便后面使用。配置文件的名称是计算出来的。算法如下：

通过字符串 “device_uuid_0”计算hash，算法如下：
```c++
LPCWSTR lpUuid = L"device_uuid_0";
DWORD dwUuidHash = 0;
do
{
	dwUuidHash = *lpUuid + 31 * dwUuidHash;
	++lpUuid;
} while (*lpUuid != 0);

wsprintf(szDeviceIdPath, L"%s%x.ini", szDeviceIdPath, dwUuidHash);
```
计算后的值为：C9D52EB5，相应的配置文件名为C9D52EB5.ini

正常情况下 WX安装完后，便会生成该文件，并把计算出来的设备id保存到该文件。
该文件中的数据就是设备id，We58b27f6b9bbaaa8 
设备id每个机器是不一样的。使用时，直接读取该文件即可。

![avatar](/images/pages/2021_6_1_wx_applet_lnk/applet-device-id-conf.png)

### 设备id动态生成算法
取设备的物理id

![avatar](/images/pages/2021_6_1_wx_applet_lnk/adapeter.png)

拼接成字符串
```
XXXXXXXXXXXX005056c00008
```

求内存数据的md5
```
00F5CC08  C4 XX 6X 4X EX 0X 0X 5X 5X CX 0X 0X 00 00 00 00  Ä4kOê..PVÀ......  
```

得到：
```
00F5C8F0  31 87 93 D4 DB BE EC 58 F2 BD 93 B9 A9 CC C1 F4  1..ÔÛ¾ìXò½.¹©ÌÁô  
```

转换成字符串
```
00F5C900  33 31 38 37 39 33 64 34 64 62 62 65 65 63 35 38  318793d4dbbeec58  
00F5C910  66 32 62 64 39 33 62 39 61 39 63 63 63 31 66 34  f2bd93b9a9ccc1f4  
```

取cpuid
```
int sub_5F448C50()
{
    _EAX = 0;
    __asm { cpuid }
    _EAX = 1;
    __asm { cpuid }
    return _EDX;
}
```

计算设备id
```
拼接物理地址和cpuid

```
![avatar](/images/pages/2021_6_1_wx_applet_lnk/device-join.png)

```
00F5DDCC  33 31 38 XX XX XX 64 34 64 62 62 65 65 63 35 38  318XXXd4dXXXec58  
00F5DDDC  66 32 62 XX 39 XX 62 39 XX 39 63 XX 63 31 XX 34  f2bd93bXX9cXcXX4  
00F5DDEC  2D 31 30 37 35 30 35 33 35 36 39 00 00 00 00 00  -10XXX53XX9.....  
```

计算字符串的md5,得到 eXXX27f6bXXXXXX874XXXc0dXXXd25e7
```
00F5DBC0  E5 XX XX F6 B9 XX XX A8 74 9A 1C 0D XX XX 25 E7  å.'ö¹»ª¨t...¥.%ç  
```

md5转字符串 ，得到字符串 e5XXXXf6b9XXXXa8749a1c0dXXXX25e7  
```
00F5DBD0  65 XX XX XX XX XX XX XX XX XX XX XX XX XX XX 38  e5XXXXXXXXXXXXX8  
00F5DBE0  37 34 XX XX 3X 6X 3X 6X X1 X5 X0 6X 3X 3X 6X 3X  XXXXXXXXXXXXXXX7  
```

用字符 "W" + 得到md5 
```
We5XXXXXXXXXXXXX8XXXXXXXXXXXXXXX7
```

截取前11个字符，得到最终的设备id
We5XXXXXXXXXXXXX8

```c++
BOOL GetAesKey(CStringA &szDeviceID, unsigned char * key)
{
	unsigned char *lpMem = (unsigned char *)szDeviceID.GetString();

	if (szDeviceID.GetLength() < 16)
	{
		return FALSE;
	}

	for (int i = 0; i < 16; ++i)
	{
		unsigned char uTmp = 0;
		unsigned char uch = lpMem[i];
		if (uch >= 0x64u)
		{
			if (uch <= 0xA8u)
				uTmp = uch + 19;
			else
				uTmp = uch - 0x25;
		}
		else
		{
			uTmp = uch + 0x35;
		}

		key[i] = uTmp;
	}

	return TRUE;
}
```

运算后得到，前16个字节为最终的aes key
```
0CA3EB28  8X XX XX XX XX XX XX XX XX XX XX XX XX XX XX X6  .XXX.XXXX.X.....  
0CA3EB38  6D                                                                 m
```

 拿到设备id后，会用设备id对数据进行解密，aes ecb 解密

 ![avatar](/images/pages/2021_6_1_wx_applet_lnk/aes-ecb-decrypt.png)

数据解密后，WX做了特殊的处理，需要再进行下面的步骤
解密后的数据以16个字节为一组，前16字节与key对应的位进行异或，后续字节与待解密的数据从头开始异或。最终会得到明文的数据，
下面的代码是根据WX的算法，整理出来的
```c++
DWORD dwBlocks = dwBytesRead / 16;
int nBlockIndex = 0;
for (int i = 0; i < dwBlocks; i++)
{
    aes_decrypt_ecb(key, 16, &pBuf[i * 16], (unsigned char *)&pAppletData[i * 16], 1);

    if (i == 0)
    {
        *(DWORD*)&pAppletData[i * 16] ^= *(DWORD*)&key[i * 16];
        *(DWORD*)&pAppletData[i * 16 + 4] ^= *(DWORD*)&key[i * 16 + 4];
        *(DWORD*)&pAppletData[i * 16 + 8] ^= *(DWORD*)&key[i * 16 + 8];
        *(DWORD*)&pAppletData[i * 16 + 12] ^= *(DWORD*)&key[i * 16 + 12];
    }
    else
    {
        *(DWORD*)&pAppletData[i * 16] ^= *(DWORD*)&pBuf[(i - 1) * 16];
        *(DWORD*)&pAppletData[i * 16 + 4] ^= *(DWORD*)&pBuf[(i - 1) * 16 + 4];
        *(DWORD*)&pAppletData[i * 16 + 8] ^= *(DWORD*)&pBuf[(i - 1) * 16 + 8];
        *(DWORD*)&pAppletData[i * 16 + 12] ^= *(DWORD*)&pBuf[(i - 1) * 16 + 12];
    }
}
```

解密后会把要添加的小程序id，添加到原有的数据后面

 ![avatar](/images/pages/2021_6_1_wx_applet_lnk/save-new-applet-id.png)

 整理后的代码如下：
 ```c++
BYTE szFill = 16 - szDesktopApplets.GetLength() % 16;

memset(pAppletData, szFill, dwNewLen);
memcpy(pAppletData, szDesktopApplets.GetString(), szDesktopApplets.GetLength());

DWORD dwNewFileLen = szDesktopApplets.GetLength() % 16 ? ((szDesktopApplets.GetLength() / 16) + 1) * 16 : szDesktopApplets.GetLength();
for (int i = 0; i < dwNewFileLen / 16; ++i)
{
    if (i == 0)
    {
        *(DWORD*)&pAppletData[i * 16] ^= *(DWORD*)&key[i * 16];
        *(DWORD*)&pAppletData[i * 16 + 4] ^= *(DWORD*)&key[i * 16 + 4];
        *(DWORD*)&pAppletData[i * 16 + 8] ^= *(DWORD*)&key[i * 16 + 8];
        *(DWORD*)&pAppletData[i * 16 + 12] ^= *(DWORD*)&key[i * 16 + 12];
    }
    else
    {
        *(DWORD*)&pAppletData[i * 16] ^= *(DWORD*)&pBuf[(i - 1) * 16];
        *(DWORD*)&pAppletData[i * 16 + 4] ^= *(DWORD*)&pBuf[(i - 1) * 16 + 4];
        *(DWORD*)&pAppletData[i * 16 + 8] ^= *(DWORD*)&pBuf[(i - 1) * 16 + 8];
        *(DWORD*)&pAppletData[i * 16 + 12] ^= *(DWORD*)&pBuf[(i - 1) * 16 + 12];
    }

    aes_encrypt_ecb(key, 16, (unsigned char *)&pAppletData[i * 16], &pBuf[i * 16], 1);
}
```

