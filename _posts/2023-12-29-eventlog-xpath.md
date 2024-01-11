---
layout: post
title: eventlog xpath 查询语法
date: 2023-12-29
tags: windows系统机制  
---

## Life
本来无一物，何处惹尘埃。写给下一年的寄语

## 简单介绍
win7以上的系统日志，支持筛选， 格式遵循 XPath 语法。 下面来探索一下 使用方法。以下所有例子都基于 Secutiry 系统日志。
```
<QueryList>
  <Query Id="0" Path="Security">
    <Select Path="Security">*</Select>
  </Query>
</QueryList>
```

这是最基本的语法， QueryList 下面的Query子项会有Path路径，表示要查询到的日志文件, 这里是 Securiry 日志。

整个查询的核心操作都是要围绕下面这一句展开
```
<Select Path="Security">*</Select>
```

下面是一条日志的详细信息，辅助解释说明下面的例子
```
<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
    <System>
        <Provider Name="Microsoft-Windows-Security-Auditing" Guid="{54849625-5478-4994-a5ba-3e3b0328c30d}" />
        <EventID>4624</EventID>
        <Version>2</Version>
        <Level>0</Level>
        <Task>12544</Task>
        <Opcode>0</Opcode>
        <Keywords>0x8020000000000000</Keywords>
        <TimeCreated SystemTime="2023-12-29T01:38:59.7573923Z" />
        <EventRecordID>238175</EventRecordID>
        <Correlation ActivityID="{d5471496-378f-0002-5715-47d58f37da01}" />
        <Execution ProcessID="1012" ThreadID="1080" />
        <Channel>Security</Channel>
        <Computer>2SCDJH3</Computer>
        <Security />
    </System>
    <EventData>
        <Data Name="SubjectUserSid">S-1-5-18</Data>
        <Data Name="SubjectUserName">2SCDJH3$</Data>
        <Data Name="SubjectDomainName">1</Data>
        <Data Name="SubjectLogonId">0x3e7</Data>
        <Data Name="TargetUserSid">S-1-5-18</Data>
        <Data Name="TargetUserName">SYSTEM</Data>
        <Data Name="TargetDomainName">NT AUTHORITY</Data>
 
        <Data Name="TargetLogonId">0x3e7</Data>
        <Data Name="LogonType">5</Data>
        <Data Name="LogonProcessName">Advapi</Data>
        <Data Name="AuthenticationPackageName">Negotiate</Data>
        <Data Name="WorkstationName">-</Data>
        <Data Name="LogonGuid">{00000000-0000-0000-0000-000000000000}</Data>
        <Data Name="TransmittedServices">-</Data>
        <Data Name="LmPackageName">-</Data>
        <Data Name="KeyLength">0</Data>
        <Data Name="ProcessId">0x3ec</Data>
        <Data Name="ProcessName">C:\Windows\System32\services.exe</Data>
        <Data Name="IpAddress">-</Data>
        <Data Name="IpPort">-</Data>
        <Data Name="ImpersonationLevel">%%1833</Data>
        <Data Name="RestrictedAdminMode">-</Data>
        <Data Name="TargetOutboundUserName">-</Data>
        <Data Name="TargetOutboundDomainName">-</Data>
        <Data Name="VirtualAccount">%%1843</Data>
        <Data Name="TargetLinkedLogonId">0x0</Data>
        <Data Name="ElevatedToken">%%1842</Data>
    </EventData>
</Event>
```

## 简单例子
查询 指定eventid
```
<Select Path="Security">*[System[(EventID=4624 or EventID=4625 or EventID=4626)]]
```

其中 System 表示xml中的System节点, 而[System[(EventID=4624)]] 则表示要 筛选 System节点下的 EventID 节点。

如果是筛选属性，例如下面这条,筛选一个小时以内的数据。
```
<Select Path="Security">*[System[TimeCreated[timediff(@SystemTime) &lt;= 3600000]]]</Select>

属性前面增加 @ 符号，来表示 SystemTime 是 TimeCreated 节点的属性。
&lt; 表示 xml中的小于号的意思（html中小于号需要转义，否则会混淆），
这句话翻译成白话的话，就是 TimeCreated 节点下的 SystemTime属性中的时间 要 <= 3600000 这个时间段（也就是一个小时）
```



筛选指定时间到指定时间的数据
```
<Select Path="Security">*[System[(EventID=4624) and TimeCreated[@SystemTime&gt;='2023-12-28T02:07:50.000Z' and @SystemTime&lt;='2023-12-29T02:07:50.999Z']]]</Select>

&gt; 表示大于号的意思 也就是 @SystemTime >= '2023-12-28T02:07:50.000Z' and @SystemTime <= '2023-12-29T02:07:50.999Z'。限定了查询的时间范围。
```

查询从指定时间开始，1个小时内的数据
```
<Select Path="Security">*[System[(EventID=4624) and TimeCreated[@SystemTime&gt;='2023-12-28T02:07:50.000Z' and timediff(@SystemTime) &lt;= 3600000]]]</Select>
```
筛选完 System节点，来个进阶的
```
例如：筛选 4624 日志中 EventData 节点。包含这句话的日志 <Data Name="TargetUserName">SYSTEM</Data>

<Select Path="Security">*[System[(EventID=4624)] and EventData[Data[@Name='TargetUserName']='SYSTEM']]</Select>
```
这个地方要重点说一下， 如果是想筛选 Data是'SYSTEM' 的数据，只需要写 Data='SYSTEM'。
如果还要带上属性，就比如上面的例子 Data 节点中 Name属性是 'TargetUserName' 的节点，并且值是 'SYSTEM'，则只需要在原有基础上带上属性描述信息[@Name='TargetUserName']。
所以完整的句子就是 ： Data[@Name='TargetUserName']='SYSTEM'


如果想要一次筛选多个不同的路径的日志，则可以这么写
```
<QueryList>
<Query Id='0'>
	<Select Path='System'>*[System[(EventID=7045)]]</Select>
	<Select Path='Security'>*[System[(EventID=4624)]]</Select>
</Query>
</QueryList>
```

参照上述说的语法，只需要简单拼接后，就可以实现只有组合了。
