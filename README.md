# Event-Sourcing-System-in-Node.js-
Event Sourcing System in Node.js 

# Event Sourcing System

A complete Event Sourcing implementation in traditional JavaScript using Node.js basic modules.

## Features

- **Traditional JavaScript**: Uses var declarations, function declarations, and prototype-based inheritance
- **No External Dependencies**: Uses only Node.js built-in modules (http, url, querystring)
- **Event Store**: Persists all domain events in memory
- **Event Replay**: Reconstructs aggregate state by replaying events
- **RESTful API**: HTTP server with JSON endpoints
- **Bank Account Domain**: Example implementation with accounts, deposits, and withdrawals

## Architecture

### Components

1. **Event Store**: Stores all events in chronological order
2. **Account Aggregate**: Domain model that applies events to build current state
3. **Command Handler**: Processes commands and generates events
4. **HTTP Server**: Exposes REST API endpoints

### Event Types

- `AccountCreated`: Initial account creation
- `MoneyDeposited`: Deposit transaction
- `MoneyWithdrawn`: Withdrawal transaction
- `AccountClosed`: Account closure

## Installation

No installation needed! Just Node.js runtime.

## Usage

### Start the Server

```bash
node event-sourcing-system.js
```

The server will start on port 3000.

### Run Tests

In a separate terminal:

```bash
node test-client.js
```

## API Endpoints

### Create Account
```bash
POST /account/create
Content-Type: application/json

{
  "accountId": "ACC001",
  "owner": "John Doe",
  "initialBalance": 100
}
```

### Deposit Money
```bash
POST /account/deposit
Content-Type: application/json

{
  "accountId": "ACC001",
  "amount": 50
}
```

### Withdraw Money
```bash
POST /account/withdraw
Content-Type: application/json

{
  "accountId": "ACC001",
  "amount": 30
}
```

### Close Account
```bash
POST /account/close
Content-Type: application/json

{
  "accountId": "ACC001"
}
```

### Get Account State
```bash
GET /account/ACC001
```

Returns the current state of the account by replaying all events.

### Get Account Events
```bash
GET /events/ACC001
```

Returns all events for a specific account.

### Get All Events
```bash
GET /events
```

Returns all events in the system.

## Testing with cURL

### Create an account
```bash
curl -X POST http://localhost:3000/account/create \
  -H "Content-Type: application/json" \
  -d '{"accountId":"ACC001","owner":"John Doe","initialBalance":100}'
```

### Deposit money
```bash
curl -X POST http://localhost:3000/account/deposit \
  -H "Content-Type: application/json" \
  -d '{"accountId":"ACC001","amount":50}'
```

### Withdraw money
```bash
curl -X POST http://localhost:3000/account/withdraw \
  -H "Content-Type: application/json" \
  -d '{"accountId":"ACC001","amount":30}'
```

### Check account balance
```bash
curl http://localhost:3000/account/ACC001
```

### View event history
```bash
curl http://localhost:3000/events/ACC001
```

## Event Sourcing Principles

### Event Store
All state changes are stored as events. The event store is append-only and immutable.

### Event Replay
Current state is derived by replaying all events from the beginning. This allows:
- Time travel (view state at any point in history)
- Audit trail (complete history of all changes)
- Event replay for debugging

### Commands vs Events
- **Commands**: Intentions to change state (CreateAccount, Deposit, Withdraw)
- **Events**: Facts that have occurred (AccountCreated, MoneyDeposited, MoneyWithdrawn)

### Aggregates
Domain entities (Account) that process commands and apply events to maintain consistency.

## Code Structure

```
event-sourcing-system.js
├── EventStore
│   ├── append()          - Add new event
│   ├── getEventsForAggregate() - Get events for specific aggregate
│   └── getAllEvents()    - Get all events
├── Account (Aggregate)
│   ├── apply()           - Apply event to change state
│   ├── loadFromHistory() - Replay events
│   └── toJSON()          - Serialize state
├── CommandHandler
│   ├── createAccount()   - Handle create command
│   ├── deposit()         - Handle deposit command
│   ├── withdraw()        - Handle withdraw command
│   └── getAccountState() - Reconstruct state from events
└── EventSourcingServer
    ├── start()           - Start HTTP server
    └── handleRequest()   - Route HTTP requests
```

## Example Flow

1. User sends POST /account/create
2. CommandHandler validates and creates AccountCreated event
3. Event is appended to EventStore
4. User sends POST /account/deposit
5. CommandHandler creates MoneyDeposited event
6. Event is appended to EventStore
7. User requests GET /account/ACC001
8. System replays all events for ACC001 to reconstruct current state
9. Current state is returned to user

## Benefits

- **Audit Trail**: Complete history of all changes
- **Time Travel**: Can reconstruct state at any point in time
- **Event Replay**: Can rebuild read models from events
- **Debugging**: Can replay events to understand what happened
- **Scalability**: Events can be processed asynchronously
- **Integration**: Other systems can subscribe to events

## Limitations

- **Memory Storage**: Events stored in memory (not persistent)
- **No Snapshots**: Every state rebuild replays all events
- **No Event Versioning**: Events cannot be migrated
- **Single Process**: Not distributed

## Extending the System

You can extend this system by:

1. Adding more event types (AccountUpgraded, InterestPaid, etc.)
2. Implementing snapshots to optimize event replay
3. Adding event subscribers/projections
4. Persisting events to disk or database
5. Implementing event versioning
6. Adding more aggregates (Transaction, Customer, etc.)

## License

Free to use and modify.

