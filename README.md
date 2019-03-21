# Simple Rest API created with Hapi.js

# Initial Setup

install dependencies:

`npm install`

# Start the server

`npm start`

or for verbose output

`DEBUG=true npm start`

# Test

### GET
```bash
curl --user user:pass http://hostname:4000/customer/938472
```

### POST

```bash

curl --user user:pass -d '{"cusnum":9008, "lstnam":"Bryant", "init":"K B", "street":"100 Broadway", "city":"LA", "state":"CA", "zipcod":9999, "cdtlmt":2000, "chgcod":1, "baldue":250, "cdtdue":0.00}' -H 'Content-Type: application/json' -X POST http://hostname:4000/customer

```
### PUT
```bash

curl --user user:pass -d '{"cusnum":9008, "lstnam":"Jordan", "init":"M J"}' -H 'Content-Type: application/json' -X PUT http://hostname:4000/customer

```

### DELETE


```bash
curl --user user:pass -X DELETE http://hostname:4000/customer/9008
```
