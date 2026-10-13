# Uses only the existing Supabase CLI credential, never browser session storage.
# SQL is supplied on stdin. Tokens are never written to output or disk.
param([switch]$FunctionLogs)
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class PortalCliCredential {
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
 public struct Credential {public uint Flags; public uint Type; public string TargetName; public string Comment; public long LastWritten; public uint CredentialBlobSize; public IntPtr CredentialBlob; public uint Persist; public uint AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName;}
 [DllImport("advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool Read(string target,uint type,uint flags,out IntPtr result);
 [DllImport("advapi32.dll")] static extern void CredFree(IntPtr value);
 public static string Token(){IntPtr p;if(!Read("Supabase CLI:supabase",1,0,out p))throw new Exception("CLI credential unavailable");try{var c=(Credential)Marshal.PtrToStructure(p,typeof(Credential));var b=new byte[c.CredentialBlobSize];Marshal.Copy(c.CredentialBlob,b,0,b.Length);return System.Text.Encoding.UTF8.GetString(b);}finally{CredFree(p);}}
}
'@
try {
  $portalToken = [PortalCliCredential]::Token()
  if ($portalToken.StartsWith('go-keyring-base64:')) { $portalToken=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($portalToken.Substring(18))) }
  if ($portalToken -notmatch '^sbp_(oauth_|v0_)?[a-f0-9]{40}$') { throw 'Invalid CLI credential format' }
  $portalSql=[Console]::In.ReadToEnd()
  if ($FunctionLogs) {
    $portalEnd=[DateTime]::UtcNow
    $portalUrl='https://api.supabase.com/v1/projects/irzjkdxxfvobtabwkqmz/analytics/endpoints/logs?sql='+[Uri]::EscapeDataString($portalSql)+'&iso_timestamp_start='+[Uri]::EscapeDataString($portalEnd.AddMinutes(-15).ToString('o'))+'&iso_timestamp_end='+[Uri]::EscapeDataString($portalEnd.ToString('o'))
    $portalResult=Invoke-RestMethod -Method Get -Uri $portalUrl -Headers @{Authorization="Bearer $portalToken"} -TimeoutSec 60
  } else {
    $portalResult=Invoke-RestMethod -Method Post -Uri 'https://api.supabase.com/v1/projects/irzjkdxxfvobtabwkqmz/database/query' -Headers @{Authorization="Bearer $portalToken"} -ContentType 'application/json' -Body (@{query=$portalSql}|ConvertTo-Json -Compress) -TimeoutSec 60
  }
  ConvertTo-Json -InputObject @($portalResult) -Depth 40 -Compress
} catch {
  # Provider errors can include query text or credentials. Keep diagnostics private.
  [Console]::Error.WriteLine('Supabase management query failed. Sensitive details withheld.')
  exit 1
} finally { $portalToken=$null }
