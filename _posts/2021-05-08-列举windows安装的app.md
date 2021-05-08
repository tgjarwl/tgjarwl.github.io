---
layout: post
title: 列举windows安装的app
date: 2021-05-08
tags: windows开发
---

## 前言
有时候不得不说，windows是越来越复杂了，复杂到一个看似很小的功能，却有很多复杂的细节要处理

## 不重复造轮子
我们都知道，windows的程序要想在 控制面版 中的 卸载 里面出现，需要写入以下的注册表键值中
```
SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall
```
想当然的我们要做的事情，就是枚举下这个键值下面的值，然后整理出来一个列表即可。本着不重复造轮子的想法，在google上随便找了一段代码，于是各种意想不到的情况出现了

```
问题1： 键值下面竟然有补丁类的信息
Windows Registry Editor Version 5.00

[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{90160000-0011-0000-1000-0000000FF1CE}_Office16.PROPLUS_{0AC6D015-7968-4648-8CA8-51A6B1AE98C2}]
"DisplayName"="Update for Microsoft Office 2016 (KB3141456) 64-Bit Edition"
"MoreInfoURL"="https://support.microsoft.com/kb/3141456"
"URLInfoAbout"="https://support.microsoft.com/kb/3141456"
"HelpLink"="https://support.microsoft.com/kb/3141456"
"Publisher"="Microsoft"
"ParentKeyName"="Office16.PROPLUS"
"ParentDisplayName"="Microsoft Office 专业增强版 2016 "
"UninstallString"="\"C:\\Program Files\\Common Files\\Microsoft Shared\\OFFICE16\\Oarpmany.exe\" /removereleaseinpatch \"{90160000-0011-0000-1000-0000000FF1CE}\" \"{0AC6D015-7968-4648-8CA8-51A6B1AE98C2}\" \"2052\" \"0\""
"NoRemove"=dword:00000000
"NoModify"=dword:00000001
"IsMinorUpgrade"=dword:00000000
"NoRepair"=dword:00000001
```

```
问题2：枚举出来的竟然跟控制面板中的不一样。

很明显控制面板中的结果更符合我们的预期一些
```

于是第一个难题就摆在了眼前。看来是小看了这个功能，那就继续google下吧。很长时间后并没有发现有价值的，在github上发现了一个同学的代码
```
https://github.com/mavenlin/ListPrograms
```
评估后就放弃了。

## 控制面板是如何枚举的
这个问题，我想只有控制面板自己知道。于是乎，拿出来神器，procmon。一顿操作后，在appwiz.cpl模块中找到了一些关键的代码
```c++
__int64 __fastcall CEnumInstalledApps::_GetNextLegacyAppFromRegistry(CEnumInstalledApps *this, unsigned int a2, struct IInstalledApp **a3)
{
  void **v3; // r14
  unsigned int v4; // er15
  CEnumInstalledApps *v5; // rsi
  int v6; // edi
  DWORD v7; // edx
  HKEY v8; // rcx
  int v9; // ebx
  HKEY v10; // rcx
  const struct _GUID *v11; // r8
  HKEY v12; // rcx
  int pvData; // [rsp+40h] [rbp-C0h]
  HKEY phkResult; // [rsp+48h] [rbp-B8h]
  DWORD cchName; // [rsp+50h] [rbp-B0h]
  DWORD pcbData; // [rsp+54h] [rbp-ACh]
  DWORD v18; // [rsp+58h] [rbp-A8h]
  DWORD pdwType; // [rsp+5Ch] [rbp-A4h]
  int v20; // [rsp+60h] [rbp-A0h]
  struct _FILETIME ftLastWriteTime; // [rsp+68h] [rbp-98h]
  WCHAR Name; // [rsp+70h] [rbp-90h]

  v3 = (void **)a3;
  *a3 = 0i64;
  v4 = a2;
  v5 = this;
  v6 = -2147467259;
  do
  {
    v7 = *((_DWORD *)v5 + 5);
    v8 = (HKEY)*((_QWORD *)v5 + 4);
    v9 = 1;
    cchName = 260;
    if ( RegEnumKeyExW(v8, v7, &Name, &cchName, 0i64, 0i64, 0i64, &ftLastWriteTime) )
    {
      v6 = -2147467259;
      v9 = 0;
    }
    else
    {
      v10 = (HKEY)*((_QWORD *)v5 + 4);
      ++*((_DWORD *)v5 + 5);
      phkResult = 0i64;
      if ( !RegOpenKeyExW(v10, &Name, 0, 0x20019u, &phkResult) )
      {
        pvData = 0;
        pcbData = 4;
        if ( SHQueryValueExW(phkResult, L"SystemComponent", 0i64, &pdwType, &pvData, &pcbData) || pvData != 1 )
        {
          v18 = 4;
          if ( SHQueryValueExW(phkResult, L"WindowsInstaller", 0i64, &pdwType, &v20, &v18) || v20 != 1 )
          {
            v6 = CInstalledApp::s_CreateInstance(v4, &Name, v11, v3);
            if ( v6 >= 0 )
              v9 = 0;
          }
        }
      }
      v12 = phkResult;
      phkResult = 0i64;
      if ( v12 )
        RegCloseKey(v12);
    }
  }
  while ( v9 );
  return (unsigned int)v6;
}
```
代码抄过来之后，发现并不能跟控制面板达到一致的效果，不是很理想，看来，微软又把代码分成了好几部分。于是去win10 设置中的 应用和功能 中碰碰运气，分析后发现关键代码位于下面的dll中

```
SettingsHandlers_StorageSense.dll
```

## 比着轮子造轮子
有时候造轮子是出于无奈，虽不想直接复制现成的代码呢！！！
于是赶紧又对比ida，在x64dbg中调试一番后, 又抄写了一份。
``` c++
#define UNINSTALL_SOFT L"SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall"
#define UNINSTALL_Wow64_SOFT L"SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall"

DWORD CAppInfo::GetInstalled(vector<UnInstalledAppInfo>& installedList)
{
    m_installedList.clear();

    GetInstalledApp(HKEY_LOCAL_MACHINE, UNINSTALL_SOFT, installedList);
    GetInstalledApp(HKEY_CURRENT_USER, UNINSTALL_SOFT, installedList);

    GetInstalledApp(HKEY_LOCAL_MACHINE, UNINSTALL_Wow64_SOFT, installedList);
    GetInstalledApp(HKEY_CURRENT_USER, UNINSTALL_Wow64_SOFT, installedList);

    WCHAR productCode[39] = { 0 };
    int iIdx = 0;
    while (MsiEnumProducts(iIdx, productCode) == ERROR_SUCCESS)
    {
        WCHAR MsiReg[MAX_PATH] = { 0 };
        StringCchPrintf(MsiReg, MAX_PATH, L"%s\\%s", UNINSTALL_SOFT, productCode);

        HKEY hUninstallKey;

        if (!RegOpenKeyEx(HKEY_LOCAL_MACHINE, MsiReg, 0, KEY_READ, &hUninstallKey) || 
            StringCchPrintf(MsiReg, MAX_PATH, L"%s\\%s", UNINSTALL_Wow64_SOFT, productCode), !RegOpenKeyEx(HKEY_LOCAL_MACHINE, MsiReg, 0, KEY_READ, &hUninstallKey))
        {
            DWORD dwStatus = MsiQueryProductState(productCode) - 1;
            if (!(dwStatus & INSTALLSTATE_INCOMPLETE))
            {
                UnInstalledAppInfo uAppInfo;
                DumpApp(HKEY_LOCAL_MACHINE, MsiReg, &uAppInfo);
            }
        }

        ++iIdx;
    }
    
    installedList = m_installedList;
    return ERROR_SUCCESS;
}
```

上面这段代码分为两部分，第一部分是遍历Uninstall注册表键值下的值，这部分又分为4处，分别是 HKLM下的Wow6432Node和64位的路径，以及 HKCU下的Wow6432Node和64位的路径。第二部分是通过msi的api遍历安装的产品。根据这两部分信息，最终去重复组合后，拼成了完整的安装列表。在第一部分遍历Uninstall注册表时，如果键值下出现了WindowsInstaller为1或者出现了SystemComponent为1，那这些注册表安装信息是要放弃的。第二部分通过msi接口枚举时，只需要判断SystemComponent是否为1即可。于是完整的安装列表就完成了，测试后完美。

```c++
DWORD CAppInfo::GetInstalledApp(HKEY hRootKey, LPCWSTR lpSubKey, vector<UnInstalledAppInfo>& installedList)
{
    HKEY hKey;
    LSTATUS lStatus = RegOpenKeyEx(hRootKey, lpSubKey, 0, KEY_READ, &hKey);
    if (lStatus != ERROR_SUCCESS)
    {
        return lStatus;
    }

    WCHAR szAppBuf[MAX_PATH] = { 0 };
    for (int index = 0; ; ++index)
    {
        UnInstalledAppInfo AppInfo;
        lStatus = RegEnumKey(hKey, index, szAppBuf, sizeof(szAppBuf));

        if (lStatus != ERROR_SUCCESS)
        {
            break;
        }

        DWORD dwType = 0;
        DWORD dwData = 0;
        DWORD cbDataSize = sizeof(DWORD);
        if (SHQueryValueEx(hKey, L"WindowsInstaller", 0, &dwType, &dwData, &cbDataSize) || dwData != 1)
        {
            DumpApp(hKey, szAppBuf, &AppInfo);
        }
    }

    RegCloseKey(hKey);
    return ERROR_SUCCESS;
}

DWORD CAppInfo::DumpApp(HKEY hParent, LPCTSTR szKey, PUnInstalledAppInfo pAppInfo)
{
    HKEY hKey;
    LONG size;
    TCHAR buffer[MAX_PATH];
    LSTATUS lr = RegOpenKey(hParent, szKey, &hKey);
    if (lr != ERROR_SUCCESS)
    {
        return lr;
    }

    DWORD dwType = 0;
    DWORD dwData = 0;
    DWORD cbDataSize = sizeof(DWORD);
    if (!SHQueryValueEx(hKey, L"SystemComponent", 0, &dwType, &dwData, &cbDataSize) && dwData == 1)
    {
        return lr;
    }

    size = sizeof(buffer);
    lr = GetValue(hKey, _T("DisplayName"), &buffer[0], &size);
    if (lr == ERROR_SUCCESS && size)
    {

        if (buffer[0] == 0)
        {
            return lr;
        }

        wregex cmd_kb(L"(KB\\d{6})", std::regex_constants::icase);
        match_results<wstring::const_iterator> result;
        wstring sText = buffer;
        wstring::const_iterator iter = sText.begin();
        wstring::const_iterator iterEnd = sText.end();
        while (std::regex_search(iter, iterEnd, result, cmd_kb) && (result.size() > 1))
        {
            return lr;
        }
        

        pAppInfo->DisplayName = buffer;
    }

    size = sizeof(buffer);
    lr = GetValue(hKey, _T("DisplayVersion"), &buffer[0], &size);
    if (ERROR_SUCCESS == lr && size)
    {
        pAppInfo->DisplayVersion = buffer;
    }

    size = sizeof(buffer);
    lr = GetValue(hKey, _T("InstallSource"), &buffer[0], &size);
    if (ERROR_SUCCESS == lr && size > 0)
    {
        pAppInfo->InstallSource = buffer;
    }

    size = sizeof(buffer);
    lr = GetValue(hKey, _T("UninstallPath"), &buffer[0], &size);
    if (ERROR_SUCCESS == lr && size > 0)
    {
        pAppInfo->UninstallPath = buffer;
    }

    size = sizeof(buffer);
    lr = GetValue(hKey, _T("UninstallString"), &buffer[0], &size);
    if (ERROR_SUCCESS == lr && size > 0)
    {
        pAppInfo->UninstallString = buffer;
    }

    RegCloseKey(hKey);

    RecordApp(pAppInfo);

    return ERROR_SUCCESS;
}
```

## 还是微软的轮子好
在外网没有好轮子的情况下，很多时候微软的功能给予了我们很好的参考，善于利于，收益还是杠杠的。