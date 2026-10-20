# Runs a real-service smoke test against disposable containers only.
# Requires Docker, Node.js, installed dependencies, and a prior `npm run build`.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)

$tag = [guid]::NewGuid().ToString('N').Substring(0, 8)
$pgName = "codex-review-pg-$tag"
$redisName = "codex-review-redis-$tag"
$rabbitName = "codex-review-rabbit-$tag"
$meiliName = "codex-review-meili-$tag"
$reviewPassword = [guid]::NewGuid().ToString('N')
$rabbitPassword = [guid]::NewGuid().ToString('N')
$meiliKey = [guid]::NewGuid().ToString('N')
$seedPassword = [guid]::NewGuid().ToString('N')
$env:DATABASE_URL = "postgresql://postgres:$reviewPassword@127.0.0.1:55433/review?schema=public"
$env:JWT_SECRET = [guid]::NewGuid().ToString('N')
$env:RABBITMQ_URL = "amqp://review:$rabbitPassword@127.0.0.1:55673"
$env:RABBITMQ_QUEUE = "review_books_$tag"
$env:RABBITMQ_DURABLE = 'true'
$env:RABBITMQ_PERSISTENT = 'true'
$env:MEILISEARCH_HOST = 'http://127.0.0.1:57701'
$env:MEILISEARCH_API_KEY = $meiliKey
$env:REDIS_HOST = '127.0.0.1'
$env:REDIS_PORT = '56380'
$env:SEED_DEFAULT_PASSWORD = $seedPassword
$env:DEMO_SEED_ENABLED = 'true'
$env:NODE_ENV = 'test'
$env:CORS_ORIGINS = 'http://localhost:3000'
$env:PORT = '53002'
$backendProcess = $null
$stdoutPath = Join-Path $env:TEMP "codex-review-backend-$tag.out.log"
$stderrPath = Join-Path $env:TEMP "codex-review-backend-$tag.err.log"

try {
    docker run --rm -d --name $pgName -p 127.0.0.1:55433:5432 -e POSTGRES_DB=review -e POSTGRES_PASSWORD=$reviewPassword postgres:17-alpine | Out-Null
    docker run --rm -d --name $redisName -p 127.0.0.1:56380:6379 redis:7-alpine | Out-Null
    docker run --rm -d --name $rabbitName -p 127.0.0.1:55673:5672 -e RABBITMQ_DEFAULT_USER=review -e RABBITMQ_DEFAULT_PASS=$rabbitPassword rabbitmq:3-management | Out-Null
    docker run --rm -d --name $meiliName -p 127.0.0.1:57701:7700 -e MEILI_MASTER_KEY=$meiliKey -e MEILI_ENV=production getmeili/meilisearch:v1.15 | Out-Null

    $ready = $false
    for ($attempt = 0; $attempt -lt 80; $attempt++) {
        try {
            docker exec $pgName pg_isready -U postgres -d review 2>$null | Out-Null
            $pgReady = $LASTEXITCODE -eq 0
        } catch { $pgReady = $false }
        try { $meiliReady = (Invoke-RestMethod 'http://127.0.0.1:57701/health' -TimeoutSec 1).status -eq 'available' }
        catch { $meiliReady = $false }
        if ($pgReady -and $meiliReady) { $ready = $true; break }
        Start-Sleep -Milliseconds 500
    }
    if (-not $ready) { throw 'Temporary dependencies did not become healthy' }

    node scripts/verify-redis-lock.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Redis lock verification failed' }

    npx prisma migrate deploy | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Migration failed' }
    npm run prisma:seed | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Demo seed failed' }
    'INSERT INTO "Role" ("roleName", "status") VALUES (''EXTERNAL_TEST'', true);' | docker exec -i $pgName psql -U postgres -d review -q | Out-Null
    $countSql = 'SELECT count(*) FROM "Book";'
    $bookCountBefore = ($countSql | docker exec -i $pgName psql -U postgres -d review -At).Trim()
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    npm run prisma:seed *> $null
    $secondSeedExit = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorAction
    $bookCountAfter = ($countSql | docker exec -i $pgName psql -U postgres -d review -At).Trim()
    $externalRoleCount = ('SELECT count(*) FROM "Role" WHERE "roleName" = ''EXTERNAL_TEST'';' | docker exec -i $pgName psql -U postgres -d review -At).Trim()
    if ($secondSeedExit -ne 0 -or $bookCountBefore -ne $bookCountAfter -or $externalRoleCount -ne '1') {
        throw 'Demo seed is not repeatable'
    }
    Write-Output "SeedIdempotent=true; NonDemoRolePreserved=true; BookCount=$bookCountAfter"
    npm run test:e2e
    if ($LASTEXITCODE -ne 0) { throw 'E2E tests failed' }

    $entryPoint = Join-Path (Get-Location).Path 'dist/main.js'
    $backendProcess = Start-Process -FilePath (Get-Command node).Source -ArgumentList @($entryPoint) -WorkingDirectory $env:TEMP -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
    $ready = $false
    for ($attempt = 0; $attempt -lt 80; $attempt++) {
        try {
            $health = Invoke-RestMethod 'http://127.0.0.1:53002/health' -TimeoutSec 1
            if ($health.success -and $health.data.status -eq 'ok') { $ready = $true; break }
        } catch {}
        Start-Sleep -Milliseconds 500
    }
    if (-not $ready) { throw 'Backend health did not become ready' }

    $openApi = Invoke-RestMethod 'http://127.0.0.1:53002/api/docs-json' -TimeoutSec 5
    $loginDoc = $openApi.paths.PSObject.Properties['/auth/login'].Value.post
    $ordersDoc = $openApi.paths.PSObject.Properties['/orders'].Value.post
    $bookDoc = $openApi.paths.PSObject.Properties['/books/{id}'].Value.get
    if (-not $loginDoc.requestBody.content.'application/json'.schema.'$ref' -or
        -not $loginDoc.responses.'200'.content.'application/json'.schema.properties.data.'$ref' -or
        -not $ordersDoc.security -or
        -not $bookDoc.parameters) {
        throw 'OpenAPI schema does not describe the actual auth, order and book routes'
    }
    Write-Output 'OpenApiRoutesAndSchemas=true'

    $login = Invoke-RestMethod 'http://127.0.0.1:53002/auth/login' -Method Post -ContentType 'application/json' -Body (@{ email = 'admin@bookstore.example.com'; password = $seedPassword } | ConvertTo-Json)
    $headers = @{ Authorization = "Bearer $($login.data.accessToken)" }
    $customerLogin = Invoke-RestMethod 'http://127.0.0.1:53002/auth/login' -Method Post -ContentType 'application/json' -Body (@{ email = 'minh.tran@example.com'; password = $seedPassword } | ConvertTo-Json)
    $customerHeaders = @{ Authorization = "Bearer $($customerLogin.data.accessToken)" }
    $allOrders = Invoke-RestMethod 'http://127.0.0.1:53002/orders' -Headers $headers
    $ownOrders = Invoke-RestMethod 'http://127.0.0.1:53002/orders' -Headers $customerHeaders
    $ownIds = @($ownOrders.data | ForEach-Object { $_.id })
    $foreignOrder = $allOrders.data | Where-Object { $_.id -notin $ownIds } | Select-Object -First 1
    if (-not $foreignOrder) { throw 'No foreign order available for ownership check' }
    try {
        Invoke-RestMethod "http://127.0.0.1:53002/orders/$($foreignOrder.id)" -Headers $customerHeaders | Out-Null
        throw 'Customer read a foreign order'
    } catch {
        if ([int]$_.Exception.Response.StatusCode -ne 403) { throw }
    }
    try {
        Invoke-RestMethod 'http://127.0.0.1:53002/books' -Method Post -Headers $customerHeaders -ContentType 'application/json' -Body '{}' | Out-Null
        throw 'Customer created a book'
    } catch {
        if ([int]$_.Exception.Response.StatusCode -ne 403) { throw }
    }
    Write-Output 'ForeignOrderDenied=true; CustomerBookCreateDenied=true'
    $target = $null
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        $searchBefore = Invoke-RestMethod 'http://127.0.0.1:53002/search/books?q=Clean' -TimeoutSec 5
        $target = $searchBefore.data.hits | Where-Object { $_.title -like '*Clean Code*' } | Select-Object -First 1
        if ($target) { break }
        Start-Sleep -Seconds 1
    }
    if (-not $target) { throw 'Seeded book not found in Meilisearch after startup reconciliation' }
    $booksFirst = Invoke-RestMethod 'http://127.0.0.1:53002/books?page=1&limit=10' -TimeoutSec 5
    $booksSecond = Invoke-RestMethod 'http://127.0.0.1:53002/books?page=1&limit=10' -TimeoutSec 5
    $cacheMissObserved = [bool](Select-String -LiteralPath $stdoutPath -Pattern 'CACHE MISS: books:page:' -Quiet)
    $cacheHitObserved = [bool](Select-String -LiteralPath $stdoutPath -Pattern 'CACHE HIT: books:page:' -Quiet)

    $newBook = Invoke-RestMethod 'http://127.0.0.1:53002/books' -Method Post -Headers $headers -ContentType 'application/json' -Body (@{
        title = "QueueSync$tag"; isbn = "review-$tag"; description = 'RabbitMQ integration check'
        author = 'Review'; category = 'Review'; price = 100; stockQuantity = 2
        coverImageUrl = 'https://example.com/review.png'
    } | ConvertTo-Json)
    $rabbitIndexed = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        $synced = Invoke-RestMethod "http://127.0.0.1:53002/search/books?q=QueueSync$tag" -TimeoutSec 5
        if (@($synced.data.hits | Where-Object { $_.id -eq $newBook.data.id }).Count -eq 1) {
            $rabbitIndexed = $true
            break
        }
        Start-Sleep -Seconds 1
    }
    if (-not $rabbitIndexed) { throw 'Book change was not indexed through RabbitMQ' }
    node scripts/verify-rabbit-events.mjs
    if ($LASTEXITCODE -ne 0) { throw 'RabbitMQ delivery verification failed' }

    # Freeze delivery to prove the public endpoint filters an old index entry.
    docker stop -t 1 $rabbitName | Out-Null
    $patch = Invoke-RestMethod "http://127.0.0.1:53002/books/$($target.id)" -Method Patch -Headers $headers -ContentType 'application/json' -Body '{"status":"INACTIVE"}'
    $rawSearch = Invoke-RestMethod 'http://127.0.0.1:57701/indexes/books/search' -Method Post -Headers @{ Authorization = "Bearer $meiliKey" } -ContentType 'application/json' -Body '{"q":"Clean"}'
    $staleIndexEntry = @($rawSearch.hits | Where-Object { $_.id -eq $target.id }).Count
    $searchAfter = Invoke-RestMethod 'http://127.0.0.1:53002/search/books?q=Clean' -TimeoutSec 5
    $booksAfter = Invoke-RestMethod 'http://127.0.0.1:53002/books?page=1&limit=10' -TimeoutSec 5
    $visible = @($searchAfter.data.hits | Where-Object { $_.id -eq $target.id }).Count
    $listed = @($booksAfter.data.data | Where-Object { $_.id -eq $target.id }).Count
    npm run reindex | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Manual reindex failed' }
    $rawAfterReindex = Invoke-RestMethod 'http://127.0.0.1:57701/indexes/books/search' -Method Post -Headers @{ Authorization = "Bearer $meiliKey" } -ContentType 'application/json' -Body '{"q":"Clean"}'
    $reindexRemovedStale = @($rawAfterReindex.hits | Where-Object { $_.id -eq $target.id }).Count -eq 0
    $cacheKeys = @(docker exec $redisName redis-cli --scan --pattern 'books:page:*')
    docker stop -t 1 $redisName | Out-Null
    $fallbackBooks = Invoke-RestMethod 'http://127.0.0.1:53002/books?page=1&limit=10' -TimeoutSec 5
    $redisFallbackCount = @($fallbackBooks.data.data).Count
    [pscustomobject]@{
        Health = $health.data.status
        SearchBefore = @($searchBefore.data.hits).Count
        SearchAfter = @($searchAfter.data.hits).Count
        StaleIndexEntry = $staleIndexEntry
        ReindexRemovedStale = $reindexRemovedStale
        DisabledBookVisible = $visible
        DisabledBookListed = $listed
        BookListCountFirst = @($booksFirst.data.data).Count
        BookListCountSecond = @($booksSecond.data.data).Count
        CachedPageKeys = $cacheKeys.Count
        RedisFallbackCount = $redisFallbackCount
        CacheMissObserved = $cacheMissObserved
        CacheHitObserved = $cacheHitObserved
        RabbitIndexed = $rabbitIndexed
        UpdatedStatus = $patch.data.status
    } | ConvertTo-Json -Compress
    if ($visible -ne 0 -or $listed -ne 0 -or $staleIndexEntry -ne 1 -or -not $reindexRemovedStale -or -not $cacheMissObserved -or -not $cacheHitObserved -or $redisFallbackCount -ne 10) {
        throw 'Search access check or cache invalidation failed'
    }
} catch {
    Write-Output "Integration check failed: $($_.Exception.Message)"
    if (Test-Path $stderrPath) { Get-Content $stderrPath -Tail 20 }
    foreach ($name in @($pgName, $redisName, $rabbitName, $meiliName)) {
        try { docker logs --tail 10 $name 2>$null } catch {}
    }
    throw
} finally {
    if ($backendProcess) { Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue }
    foreach ($name in @($pgName, $redisName, $rabbitName, $meiliName)) {
        try { docker stop -t 1 $name 2>$null | Out-Null } catch {}
    }
}
