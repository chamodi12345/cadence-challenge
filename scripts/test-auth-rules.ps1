$base = "http://localhost:3001"

Write-Host "`n--- Login as Northwind Admin ---" -ForegroundColor Cyan
$nwAdmin = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -ContentType "application/json" `
  -Body '{"email":"admin@northwind.test","password":"password123"}'
$nwAdminToken = $nwAdmin.data.token
Write-Host "Got token: $($nwAdminToken.Substring(0,20))..."

Write-Host "`n--- Login as Acme Admin ---" -ForegroundColor Cyan
$acAdmin = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -ContentType "application/json" `
  -Body '{"email":"admin@acme.test","password":"password123"}'
$acAdminToken = $acAdmin.data.token
Write-Host "Got token: $($acAdminToken.Substring(0,20))..."

Write-Host "`n--- TEST 1: Northwind Admin lists Northwind users (expect 200) ---" -ForegroundColor Yellow
try {
  $result = Invoke-RestMethod -Uri "$base/users" -Method GET -Headers @{ Authorization = "Bearer $nwAdminToken" }
  Write-Host "PASS: $($result.data.Count) users returned" -ForegroundColor Green
  $result.data | Format-Table email, role
} catch {
  Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n--- TEST 2: Acme Admin lists Acme users — must NOT show Northwind data (expect 200, different list) ---" -ForegroundColor Yellow
try {
  $result = Invoke-RestMethod -Uri "$base/users" -Method GET -Headers @{ Authorization = "Bearer $acAdminToken" }
  Write-Host "PASS: $($result.data.Count) users returned" -ForegroundColor Green
  $result.data | Format-Table email, role
  $leaked = $result.data | Where-Object { $_.email -like "*northwind*" }
  if ($leaked) {
    Write-Host "SECURITY FAIL: Northwind data leaked into Acme's response!" -ForegroundColor Red
  } else {
    Write-Host "PASS: No Northwind data visible to Acme admin" -ForegroundColor Green
  }
} catch {
  Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n--- TEST 3: No token at all (expect 401) ---" -ForegroundColor Yellow
try {
  Invoke-RestMethod -Uri "$base/users" -Method GET
  Write-Host "FAIL: request succeeded without a token — this should have been blocked!" -ForegroundColor Red
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  if ($status -eq 401) {
    Write-Host "PASS: got 401 Unauthorized as expected" -ForegroundColor Green
  } else {
    Write-Host "FAIL: expected 401, got $status" -ForegroundColor Red
  }
}

Write-Host "`n--- TEST 4: Try to spoof companyId in request body (expect user created under Northwind, not Acme) ---" -ForegroundColor Yellow
try {
  $spoofResult = Invoke-RestMethod -Uri "$base/users" -Method POST -ContentType "application/json" `
    -Headers @{ Authorization = "Bearer $nwAdminToken" } `
    -Body '{"email":"spoofcheck@test.com","fullName":"Spoof Check","role":"FINANCE","companyId":"cmp_acme"}'
  Write-Host "User created: $($spoofResult.data.email)" -ForegroundColor Green

  $nwUsers = Invoke-RestMethod -Uri "$base/users" -Method GET -Headers @{ Authorization = "Bearer $nwAdminToken" }
  $found = $nwUsers.data | Where-Object { $_.email -eq "spoofcheck@test.com" }
  if ($found) {
    Write-Host "PASS: user correctly landed under Northwind despite spoofed companyId in body" -ForegroundColor Green
  } else {
    Write-Host "SECURITY FAIL: user did not land under Northwind — companyId spoofing may have worked!" -ForegroundColor Red
  }
} catch {
  Write-Host "Request failed (may be OK if email already used): $($_.Exception.Message)" -ForegroundColor DarkYellow
}

Write-Host "`nDone.`n" -ForegroundColor Cyan