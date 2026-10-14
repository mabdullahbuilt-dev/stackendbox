# Read-only authoritative and independent recursive DNS checks. No settings change.
$ErrorActionPreference = 'Stop'
$zone = 'stackendbox.com'
$expectedDigest = '90de957dae2de4145e548a4172e6a11ef5016c0094383e53c6a1934177bb6d77'
$inventory = Get-Content -LiteralPath "$PSScriptRoot/../docs/portal/company-zone-before.json" -Raw | ConvertFrom-Json
$authorities = foreach ($server in @('launch1.spaceship.net', 'launch2.spaceship.net')) {
    $keys = @(Resolve-DnsName $zone -Type DNSKEY -Server $server -DnssecOk -DnsOnly -TcpOnly)
    $keyEvidence = foreach ($key in $keys | Where-Object Type -eq 48) {
        [byte[]]$rdata = @([byte]($key.Flags -shr 8), [byte]($key.Flags -band 255), [byte]$key.Protocol, [byte]$key.Algorithm) + $key.Key
        $sum = 0
        for ($i = 0; $i -lt $rdata.Length; $i++) { if ($i % 2 -eq 0) { $sum += [int]$rdata[$i] -shl 8 } else { $sum += $rdata[$i] } }
        $tag = ($sum + (($sum -shr 16) -band 65535)) -band 65535
        [byte[]]$wireName = @('stackendbox', 'com') | ForEach-Object { [byte]$_.Length; [Text.Encoding]::ASCII.GetBytes($_) }
        $wireName = [byte[]]($wireName + @(0))
        $digest = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([byte[]]($wireName + $rdata))).ToLowerInvariant()
        [pscustomobject]@{ keyTag = $tag; flags = $key.Flags; algorithm = $key.Algorithm; sha256 = $digest; matchesParentRecoveryDS = $digest -eq $expectedDigest }
    }
    $parity = foreach ($record in $inventory.records) {
        $name = if ($record.name -eq '@') { $zone } else { "$($record.name).$zone" }
        $answers = @(Resolve-DnsName $name -Type $record.type -Server $server -DnsOnly -TcpOnly)
        $matches = @($answers | Where-Object {
            if ($record.type -eq 'TXT') { ($_.Strings -join '') -ceq $record.content }
            elseif ($record.type -eq 'A') { $_.IPAddress -eq $record.content }
            elseif ($record.type -eq 'MX') { $_.NameExchange.TrimEnd('.') -eq $record.content -and $_.Preference -eq $record.priority }
            elseif ($record.type -eq 'SRV') { $_.NameTarget.TrimEnd('.') -eq $record.content -and $_.Priority -eq $record.priority -and $_.Weight -eq $record.weight -and $_.Port -eq $record.port }
            elseif ($record.type -eq 'CNAME') { $_.NameHost.TrimEnd('.') -eq $record.content }
        })
        [pscustomobject]@{ name = $name; type = $record.type; preserved = $matches.Count -gt 0 }
    }
    [pscustomobject]@{ server = $server; keys = @($keyEvidence); signatures = @($keys | Where-Object Type -eq 46 | Select-Object KeyTag, Signed, Expiration); nameservers = @(Resolve-DnsName $zone -Type NS -Server $server -DnsOnly -TcpOnly | Where-Object Type -eq 2 | Select-Object -ExpandProperty NameHost); inventory = @($parity) }
}
$queries = @($inventory.records | ForEach-Object {
    [pscustomobject]@{ name = $(if ($_.name -eq '@') { $zone } else { "$($_.name).$zone" }); type = $_.type }
}) + @([pscustomobject]@{name="www.$zone";type='A'}, [pscustomobject]@{name=$zone;type='DS'})
$queries = @($queries | Sort-Object name,type -Unique)
$recursive = foreach ($provider in @('https://dns.google/resolve', 'https://cloudflare-dns.com/dns-query')) {
    foreach ($query in $queries) {
        try {
            $answer = Invoke-RestMethod "$($provider)?name=$($query.name)&type=$($query.type)&cd=false&do=true" -Headers @{ Accept = 'application/dns-json' } -TimeoutSec 15
            [pscustomobject]@{ provider = $provider; name = $query.name; type = $query.type; status = $answer.Status; authenticated = $answer.AD; comment = $answer.Comment; answers = $answer.Answer }
        } catch {
            [pscustomobject]@{ provider = $provider; name = $query.name; type = $query.type; status = $null; error = 'resolver_query_unavailable' }
        }
    }
}
$defaultError = $null
try { $defaultDS = @(Resolve-DnsName $zone -Type DS -DnsOnly -QuickTimeout | Where-Object Type -eq 43 | Select-Object KeyTag, TTL) }
catch { $defaultDS = @(); $defaultError = 'default_resolver_query_unavailable' }
$gate = [DateTimeOffset]::Parse('2026-10-15T19:00:10.186Z')
[pscustomobject]@{ checkedAt = [DateTime]::UtcNow.ToString('o'); authorities = @($authorities); publicResolvers = @($recursive); defaultResolverDS = $defaultDS; defaultResolverError = $defaultError; earliestDelegationReviewUtc = $gate.ToString('o'); minimumWaitElapsed = [DateTimeOffset]::UtcNow -ge $gate; delegationAuthorized = $false; changesPerformed = 'None' } | ConvertTo-Json -Depth 8
