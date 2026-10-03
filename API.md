# Контракт API v0.1 (предлагаемый, backend ещё не реализован)

Base URL: `/api/v1`. JSON, UTF-8. Аутентификация cookie (HttpOnly, Secure); серверная защита от CSRF обязательна. Права проверяются сервером, имена пользователей и роли из клиента не считаются доверенными.

## GET /workspace

Возвращает snapshot с теми же полями, что createSeed() в seed.js:

- schemaVersion: 1
- asOf: ISO 8601
- products: id, direction, sku, name, owner, color, size, onHand, reserved, quarantine, weight, volume
- employees: id, name, direction, role
- operations: id, date, employeeId, direction, type, quantity, rate, amount, reference, confirmed
- shifts: id, date, employeeId, hours, basePay
- receipts: id, productId, direction, owner, expected, places, arrived, status, actual?, employeeId?
- places: id, direction, owner, productId, quantity, location, status, history[]
- finance: id, date, direction, kind (revenue/expense), category, amount, description
- debts: id, direction, kind (receivable/payable), party, amount, due, description
- zones: name, direction|null, area, used
- audit: at, text, actor

Это контракт демонстрационного адаптера, не окончательная схема нормализованной БД. В частности owner/location нужно заменить связями по ID в серверной модели. Права на snapshot ограничивают владельцев и финансовые данные. Для масштабирования разбить его на endpoints с фильтрами, пагинацией и агрегатами.

## POST /commands/receive

Header: `Idempotency-Key`. Body: `{id, quantity, employeeId, requestId}`.

id — ID поступления; quantity — целое число 1..100000; employeeId принадлежит направлению. Сервер атомарно сохраняет факт приёмки, изменение остатка, грузовое место, ставку и начисление. Если actual != expected, status=discrepancy. Повтор того же ключа возвращает сохранённый результат без нового движения; другой payload с тем же ключом — 409. Автор операции берётся из сессии. Дата — серверная, не клиентская.

## POST /commands/move

Header: `Idempotency-Key`. Body: `{id, location, requestId}`.

id — ID грузового места; location — адрес назначения. Сервер проверяет доступность адреса и право перемещения, сохраняет историю; товарный остаток не меняется. В промышленной модели location станет locationId.

## POST /commands/expense

Header: `Idempotency-Key`. Body: `{id, direction, category, amount, description, requestId}`.

Положительная сумма в рублях, до двух знаков после запятой. Сервер хранит в копейках/DECIMAL. Операция означает признание расхода, не оплату долга. Сервер проверяет право на финансовую запись и открытость периода.

## Ответы команд

Успешная команда возвращает актуальный snapshot, совместимый с GET /workspace. Ошибки: 400 validation, 401 unauthenticated, 403 forbidden, 409 conflict, 500 server error. JSON ошибки: `{code, message, fields?}`. UI v0.1 выводит HTTP-статус; для реальной версии добавить отображение fields и безопасного message.

## Будущие endpoints

Авторизация/выход и текущий пользователь; адресный каталог; приёмка с несколькими строками и несколькими местами; частичная приёмка; разбор расхождений; отгрузка; инвентаризация; закрытие смен; тарифы; реестр начислений; оплаты; интеграционные статусы; отчёты; `/assistant/messages` с серверным доступом к Claude.
