/**
 * Event Sourcing System
 * A complete implementation using traditional JavaScript syntax
 * No arrow functions, no const, only var, basic Node.js modules
 */

var http = require('http');
var url = require('url');
var querystring = require('querystring');

// ============================================
// Event Store - stores all events
// ============================================
function EventStore() {
    this.events = [];
    this.eventId = 1;
}

EventStore.prototype.append = function(eventType, aggregateId, data) {
    var event = {
        id: this.eventId++,
        type: eventType,
        aggregateId: aggregateId,
        data: data,
        timestamp: new Date().toISOString()
    };
    this.events.push(event);
    console.log('[EVENT STORED]', JSON.stringify(event));
    return event;
};

EventStore.prototype.getEventsForAggregate = function(aggregateId) {
    var result = [];
    for (var i = 0; i < this.events.length; i++) {
        if (this.events[i].aggregateId === aggregateId) {
            result.push(this.events[i]);
        }
    }
    return result;
};

EventStore.prototype.getAllEvents = function() {
    return this.events;
};

// ============================================
// Account Aggregate - Business logic
// ============================================
function Account(id) {
    this.id = id;
    this.balance = 0;
    this.owner = '';
    this.isActive = false;
    this.version = 0;
}

Account.prototype.apply = function(event) {
    this.version++;
    
    if (event.type === 'AccountCreated') {
        this.owner = event.data.owner;
        this.balance = event.data.initialBalance || 0;
        this.isActive = true;
    } else if (event.type === 'MoneyDeposited') {
        this.balance += event.data.amount;
    } else if (event.type === 'MoneyWithdrawn') {
        this.balance -= event.data.amount;
    } else if (event.type === 'AccountClosed') {
        this.isActive = false;
    }
};

Account.prototype.loadFromHistory = function(events) {
    for (var i = 0; i < events.length; i++) {
        this.apply(events[i]);
    }
};

Account.prototype.toJSON = function() {
    return {
        id: this.id,
        owner: this.owner,
        balance: this.balance,
        isActive: this.isActive,
        version: this.version
    };
};

// ============================================
// Command Handlers
// ============================================
function CommandHandler(eventStore) {
    this.eventStore = eventStore;
}

CommandHandler.prototype.createAccount = function(accountId, owner, initialBalance) {
    var event = this.eventStore.append('AccountCreated', accountId, {
        owner: owner,
        initialBalance: initialBalance || 0
    });
    return { success: true, event: event };
};

CommandHandler.prototype.deposit = function(accountId, amount) {
    if (amount <= 0) {
        return { success: false, error: 'Amount must be positive' };
    }
    
    var event = this.eventStore.append('MoneyDeposited', accountId, {
        amount: amount
    });
    return { success: true, event: event };
};

CommandHandler.prototype.withdraw = function(accountId, amount) {
    if (amount <= 0) {
        return { success: false, error: 'Amount must be positive' };
    }
    
    // Check current balance by replaying events
    var account = this.getAccountState(accountId);
    if (account.balance < amount) {
        return { success: false, error: 'Insufficient funds' };
    }
    
    var event = this.eventStore.append('MoneyWithdrawn', accountId, {
        amount: amount
    });
    return { success: true, event: event };
};

CommandHandler.prototype.closeAccount = function(accountId) {
    var event = this.eventStore.append('AccountClosed', accountId, {});
    return { success: true, event: event };
};

CommandHandler.prototype.getAccountState = function(accountId) {
    var events = this.eventStore.getEventsForAggregate(accountId);
    var account = new Account(accountId);
    account.loadFromHistory(events);
    return account;
};

// ============================================
// HTTP Server
// ============================================
function EventSourcingServer(port) {
    this.port = port || 3000;
    this.eventStore = new EventStore();
    this.commandHandler = new CommandHandler(this.eventStore);
}

EventSourcingServer.prototype.start = function() {
    var self = this;
    
    var server = http.createServer(function(req, res) {
        self.handleRequest(req, res);
    });
    
    server.listen(this.port, function() {
        console.log('===========================================');
        console.log('Event Sourcing System Started');
        console.log('Server running on port ' + self.port);
        console.log('===========================================');
        console.log('Available endpoints:');
        console.log('  POST /account/create');
        console.log('  POST /account/deposit');
        console.log('  POST /account/withdraw');
        console.log('  POST /account/close');
        console.log('  GET  /account/{accountId}');
        console.log('  GET  /events');
        console.log('  GET  /events/{accountId}');
        console.log('===========================================\n');
    });
};

EventSourcingServer.prototype.handleRequest = function(req, res) {
    var self = this;
    var parsedUrl = url.parse(req.url, true);
    var pathname = parsedUrl.pathname;
    var method = req.method;
    
    console.log('[REQUEST]', method, pathname);
    
    // Set CORS headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // GET endpoints
    if (method === 'GET') {
        if (pathname === '/events') {
            self.handleGetAllEvents(req, res);
        } else if (pathname.match(/^\/events\/.+/)) {
            var accountId = pathname.split('/')[2];
            self.handleGetAccountEvents(accountId, req, res);
        } else if (pathname.match(/^\/account\/.+/)) {
            var accountId = pathname.split('/')[2];
            self.handleGetAccount(accountId, req, res);
        } else {
            self.sendResponse(res, 404, { error: 'Not found' });
        }
        return;
    }
    
    // POST endpoints
    if (method === 'POST') {
        var body = '';
        
        req.on('data', function(chunk) {
            body += chunk.toString();
        });
        
        req.on('end', function() {
            var data = {};
            try {
                data = JSON.parse(body);
            } catch (e) {
                self.sendResponse(res, 400, { error: 'Invalid JSON' });
                return;
            }
            
            if (pathname === '/account/create') {
                self.handleCreateAccount(data, req, res);
            } else if (pathname === '/account/deposit') {
                self.handleDeposit(data, req, res);
            } else if (pathname === '/account/withdraw') {
                self.handleWithdraw(data, req, res);
            } else if (pathname === '/account/close') {
                self.handleCloseAccount(data, req, res);
            } else {
                self.sendResponse(res, 404, { error: 'Not found' });
            }
        });
        return;
    }
    
    self.sendResponse(res, 405, { error: 'Method not allowed' });
};

EventSourcingServer.prototype.handleCreateAccount = function(data, req, res) {
    if (!data.accountId || !data.owner) {
        this.sendResponse(res, 400, { error: 'accountId and owner are required' });
        return;
    }
    
    var result = this.commandHandler.createAccount(
        data.accountId,
        data.owner,
        data.initialBalance || 0
    );
    
    this.sendResponse(res, 201, result);
};

EventSourcingServer.prototype.handleDeposit = function(data, req, res) {
    if (!data.accountId || !data.amount) {
        this.sendResponse(res, 400, { error: 'accountId and amount are required' });
        return;
    }
    
    var result = this.commandHandler.deposit(data.accountId, data.amount);
    
    if (result.success) {
        this.sendResponse(res, 200, result);
    } else {
        this.sendResponse(res, 400, result);
    }
};

EventSourcingServer.prototype.handleWithdraw = function(data, req, res) {
    if (!data.accountId || !data.amount) {
        this.sendResponse(res, 400, { error: 'accountId and amount are required' });
        return;
    }
    
    var result = this.commandHandler.withdraw(data.accountId, data.amount);
    
    if (result.success) {
        this.sendResponse(res, 200, result);
    } else {
        this.sendResponse(res, 400, result);
    }
};

EventSourcingServer.prototype.handleCloseAccount = function(data, req, res) {
    if (!data.accountId) {
        this.sendResponse(res, 400, { error: 'accountId is required' });
        return;
    }
    
    var result = this.commandHandler.closeAccount(data.accountId);
    this.sendResponse(res, 200, result);
};

EventSourcingServer.prototype.handleGetAccount = function(accountId, req, res) {
    var account = this.commandHandler.getAccountState(accountId);
    this.sendResponse(res, 200, { account: account.toJSON() });
};

EventSourcingServer.prototype.handleGetAccountEvents = function(accountId, req, res) {
    var events = this.eventStore.getEventsForAggregate(accountId);
    this.sendResponse(res, 200, { events: events });
};

EventSourcingServer.prototype.handleGetAllEvents = function(req, res) {
    var events = this.eventStore.getAllEvents();
    this.sendResponse(res, 200, { events: events, count: events.length });
};

EventSourcingServer.prototype.sendResponse = function(res, statusCode, data) {
    res.writeHead(statusCode);
    res.end(JSON.stringify(data, null, 2));
};

// ============================================
// Start the server
// ============================================
var server = new EventSourcingServer(3000);
server.start();

// ============================================
// Example usage (commented out)
// ============================================
/*
// You can test with curl commands:

// Create account
curl -X POST http://localhost:3000/account/create \
  -H "Content-Type: application/json" \
  -d '{"accountId":"ACC001","owner":"John Doe","initialBalance":100}'

// Deposit money
curl -X POST http://localhost:3000/account/deposit \
  -H "Content-Type: application/json" \
  -d '{"accountId":"ACC001","amount":50}'

// Withdraw money
curl -X POST http://localhost:3000/account/withdraw \
  -H "Content-Type: application/json" \
  -d '{"accountId":"ACC001","amount":30}'

// Get account state
curl http://localhost:3000/account/ACC001

// Get account events
curl http://localhost:3000/events/ACC001

// Get all events
curl http://localhost:3000/events
*/
