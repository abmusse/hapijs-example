const Hapi = require('hapi');
const { Connection, DBPool } = require('idb-pconnector');
const basicAuth = require('hapi-auth-basic');

const verbose = process.env.DEBUG;

const pool = new DBPool();

// DOC: https://hapijs.com/tutorials/auth?lang=en_US
const validate = async (request, username, password) => {
  try {
    const connection = new Connection({ url: '*LOCAL', username, password });
    await connection.disconn();
    await connection.close();
  } catch (error) {
    return { credentials: null, isValid: false };
  }

  return { isValid: true, credentials: { username } };
};


const main = async () => {
  const server = Hapi.server({ port: 4000 });

  await server.register(basicAuth);

  server.auth.strategy('simple', 'basic', { validate });
  server.auth.default('simple');

  server.route({
    method: 'GET',
    path: '/customer/{number}',
    async handler(request, h) {
      try {
        request.log('route', `${request.method} ${request.path}`);
        request.log('user input', request.params);
        const data = await pool.prepareExecute('SELECT * FROM QIWS.QCUSTCDT WHERE CUSNUM = ?', [request.params.number]);
        if (!data.resultSet) {
          return h.response({ message: 'invalid customer number' }).code(404);
        }

        request.log('output', data.resultSet[0]);
        return { customer: data.resultSet[0] };
      } catch (error) {
        request.log('error', error);
        return h.response({ message: 'unable to process your query' }).code(404);
      }
    },
  });

  server.route({
    method: 'POST',
    path: '/customer',
    async handler(request, h) {
      request.log('route', `${request.method} ${request.path}`);
      request.log('user input', request.payload);

      if (request.mime !== 'application/json' || !request.payload) {
        return h.response({ message: 'expected JSON input' }).code(404);
      }

      try {
        const sql = 'INSERT INTO QIWS.QCUSTCDT VALUES (?,?,?,?,?,?,?,?,?,?,?) with NONE';

        const params = [request.payload.cusnum, request.payload.lstnam, request.payload.init,
          request.payload.street, request.payload.city, request.payload.state,
          request.payload.zipcod, request.payload.cdtlmt, request.payload.chgcod,
          request.payload.baldue, request.payload.cdtdue];

        await pool.prepareExecute(sql, params);

        return { message: 'Successfully added customer' };
      } catch (error) {
        request.log('error', error);
        return h.response({ message: 'unable to process your query' }).code(404);
      }
    },
  });

  server.route({
    method: 'PUT',
    path: '/customer',
    async handler(request, h) {
      request.log('route', `${request.method} ${request.path}`);
      request.log('user input', request.payload);

      if (request.mime !== 'application/json' || !request.payload) {
        return h.response({ message: 'expected JSON input' }).code(404);
      }

      if (!request.payload.cusnum) {
        return h.response({ message: 'cusnum is a required parameter' }).code(404);
      }

      const fields = ['cusnum', 'lstnam', 'init', 'street', 'city', 'state',
        'zipcod', 'cdtlmt', 'chgcod', 'baldue', 'cdtdue'];

      const updateFields = {};

      Object.keys(request.payload).forEach((key) => {
        if (fields.includes(key)) {
          updateFields[key] = request.payload[key];
        }
      });

      if (!Object.keys(updateFields).length) {
        return { message: 'nothing to update' };
      }

      let sql = 'UPDATE QIWS.QCUSTCDT SET ';

      Object.keys(updateFields).forEach((key, index, array) => {
        if (key !== 'cusnum') {
          sql += `${key.toUpperCase()} = ? `;

          if (index !== array.length - 1) {
            sql += ', ';
          }
        }
      });

      sql += 'WHERE CUSNUM = ? with NONE';
      request.log('generated sql', sql);

      const params = Object.values(updateFields);
      // move the value of cusnum to the end of the array
      params.push(params.splice(params.indexOf(request.payload.cusnum), 1)[0]);
      request.log('params', params);

      try {
        await pool.prepareExecute(sql, params);
        return { message: 'Successfully updated customer' };
      } catch (error) {
        request.log('error', error);
        return h.response({ message: 'unable to process your query' }).code(404);
      }
    },
  });

  server.route({
    method: 'DELETE',
    path: '/customer/{number}',
    async handler(request, h) {
      try {
        request.log('route', `${request.method} ${request.path}`);
        request.log('user input', request.params);
        await pool.prepareExecute('DELETE FROM QIWS.QCUSTCDT WHERE CUSNUM = ? with NONE', [request.params.number]);
        return { message: 'Successfully deleted customer' };
      } catch (error) {
        request.log('error', error);
        return h.response({ message: 'unable to process your query' }).code(404);
      }
    },
  });

  // DOC: https://hapijs.com/api#-request-event
  server.events.on('request', (request, event, tags) => {
    if (verbose) {
      if (tags.error) {
        console.error(event.error);
      } else {
        console.log(`${event.tags[0]}: `, event.data);
      }
      console.log('\n');
    }
  });

  await server.start();

  return server;
};

main()
  .then(server => console.log(`Server listening on ${server.info.uri}`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
