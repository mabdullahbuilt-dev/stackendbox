param([ValidateSet('Inspect','Prepare','Activate','Acceptance','PasswordPolicy')][string]$Action='Inspect')
$ErrorActionPreference='Stop'
# Use the existing supported CLI credential. Never emit secrets or full config.
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class PortalAuthCredential {
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
 public struct Credential {public uint Flags; public uint Type; public string TargetName; public string Comment; public long LastWritten; public uint CredentialBlobSize; public IntPtr CredentialBlob; public uint Persist; public uint AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName;}
 [DllImport("advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool Read(string target,uint type,uint flags,out IntPtr result);
 [DllImport("advapi32.dll")] static extern void CredFree(IntPtr value);
 public static string Token(){IntPtr p;if(!Read("Supabase CLI:supabase",1,0,out p))throw new Exception("CLI credential unavailable");try{var c=(Credential)Marshal.PtrToStructure(p,typeof(Credential));var b=new byte[c.CredentialBlobSize];Marshal.Copy(c.CredentialBlob,b,0,b.Length);return System.Text.Encoding.UTF8.GetString(b);}finally{CredFree(p);}}
}
'@
try {
  $portalToken=[PortalAuthCredential]::Token()
  if ($portalToken.StartsWith('go-keyring-base64:')) {$portalToken=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($portalToken.Substring(18)))}
  if ($portalToken -notmatch '^sbp_(oauth_|v0_)?[a-f0-9]{40}$') {throw 'Invalid CLI credential'}
  $portalHeaders=@{Authorization="Bearer $portalToken"}
  $portalEndpoint='https://api.supabase.com/v1/projects/irzjkdxxfvobtabwkqmz/config/auth'
  $portalConfig=Invoke-RestMethod -Uri $portalEndpoint -Headers $portalHeaders -TimeoutSec 30
  if ($Action -ne 'Inspect') {
    if ($Action -eq 'PasswordPolicy') {
      $portalChanges=@{password_min_length=8}
    } else {
    $portalRedirects=@($portalConfig.uri_allow_list -split ',' | Where-Object {$_})
    if ($Action -eq 'Acceptance') {
      $portalRedirects+='https://stackendbox-cf-acceptance.stackendbox.workers.dev/client-portal/auth/callback'
      $portalChanges=@{uri_allow_list=($portalRedirects|Select-Object -Unique)-join ','}
    } else {
      $portalRedirects+=@('https://www.stackendbox.com/client-portal/auth/callback','https://stackendbox-portal-preview.vercel.app/client-portal/auth/callback')
      $portalChanges=@{uri_allow_list=($portalRedirects|Select-Object -Unique)-join ',';disable_signup=$true}
    }
    if ($Action -eq 'Activate') {$portalChanges.site_url='https://www.stackendbox.com/client-portal/auth/callback'}
    }
    $null=Invoke-RestMethod -Method Patch -Uri $portalEndpoint -Headers $portalHeaders -ContentType 'application/json' -Body ($portalChanges|ConvertTo-Json -Compress) -TimeoutSec 30
    $portalConfig=Invoke-RestMethod -Uri $portalEndpoint -Headers $portalHeaders -TimeoutSec 30
  }
  @{site_url=$portalConfig.site_url;redirects=$portalConfig.uri_allow_list;public_signup_disabled=$portalConfig.disable_signup;email_enabled=$portalConfig.external_email_enabled;mfa_totp_enabled=$portalConfig.mfa_totp_enroll_enabled;email_otp_expiry_seconds=$portalConfig.mailer_otp_exp;password_min_length=$portalConfig.password_min_length;password_required_characters=$portalConfig.password_required_characters}|ConvertTo-Json -Compress
} catch {
  [Console]::Error.WriteLine('Auth configuration request failed. Sensitive response withheld.')
  exit 1
} finally {$portalToken=$null}
