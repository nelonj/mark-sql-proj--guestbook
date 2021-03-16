import express from "express";
import cors from "cors";
import { Client } from "pg";

//As your database is on your local machine, with default port,
//and default username and password,
//we only need to specify the (non-default) database name.

const client = new Client({ database: 'olivianeiljones' });

//TODO: this request for a connection will not necessarily complete before the first HTTP request is made!
client.connect();


const app = express();

/**
 * Simplest way to connect a front-end. Unimportant detail right now, although you can read more: https://flaviocopes.com/express-cors/
 */
app.use(cors());

/**
 * Middleware to parse a JSON body in requests
 */
app.use(express.json());

//When this route is called, return the most recent 100 signatures in the db
app.get("/signatures", async (req, res) => {
  const signatures1 = await client.query('SELECT * FROM signatures'); 
  const signatures = signatures1.rows//FIXME-TASK: get signatures from db!
  res.status(200).json({
    status: "success",
    data: {
      signatures //why can't I define .rows here?? Is there a way to do this more efficiently? YES, just distinguish key/value in the pair
    },
  });
});

app.get("/signatures/:id", async (req, res) => {
  // :id indicates a "route parameter", available as req.params.id
  //  see documentation: https://expressjs.com/en/guide/routing.html
  const id = parseInt(req.params.id); // params are always string type - but why do i need this???

  const signature = await client.query('select * from signatures where id=$1', [req.params.id]);   //FIXME-TASK get the signature row from the db (match on id)
  const signature1 = signature.rows
  if (signature.rowCount === 1) { // if (signature) alone would not work!! You can't just ask whether signature exists, but whether rows for that query have been returned!!
    res.status(200).json({
      status: "success",
      data: {
        signature1, //if i don't set this out as a key value pair, it will assume it is both vale AND key
      },
    });
  } else {
    res.status(404).json({
      status: "fail",
      data: {
        id: "Could not find a signature with that id identifier",
      },
    });
  }
});

app.post("/signatures", async (req, res) => {
  const { name, message } = req.body;
  if (typeof name === "string") {
    const createdSignature = await client.query("INSERT INTO signatures(signature,message) VALUES ($1, $2) RETURNING*", //add RETURNING if you want your new row entry to be visualised in the res - otherwise nothing will be returned by client.query: createdSignature will be empty!
      [name, message]); //FIXME-TASK: insert the supplied signature object into the DB

    res.status(201).json({
      status: "success",
      data: {
        signature: createdSignature.rows, //return the relevant data (including its db-generated id)
      },
    });
  } else {
    res.status(400).json({
      status: "fail",
      data: {
        name: "A string value for name is required in your JSON body",
      },
    });
  }
});

//update a signature.
app.put("/signatures/:id", async (req, res) => {
  //  :id refers to a route parameter, which will be made available in req.params.id
  const { name, message } = req.body;
  const id = parseInt(req.params.id);
  if (typeof name === "string") {

    const result = await client.query('update signatures set signature=$1, message=$2 where id=$3 returning*', 
      [name, message, id]); //FIXME-TASK: update the signature with given id in the DB.

    if (result.rowCount === 1) {
      const updatedSignature = result.rows[0]; //to get a good res: specify returning* and result.rows!!!
      res.status(200).json({
        status: "success",
        data: {
          signature: updatedSignature,
        },
      });
    } else {
      res.status(404).json({
        status: "fail",
        data: {
          id: "Could not find a signature with that id identifier",
        },
      });

    }
  } else {
    res.status(400).json({
      status: "fail",
      data: {
        name: "A string value for name is required in your JSON body",
      },
    });
  }
});

app.delete("/signatures/:id", async (req, res) => {
  const id = parseInt(req.params.id); // params are string type

  const queryResult: any = await client.query('delete from signatures where id=$1', [id]); ////FIXME-TASK: delete the row with given id from the db  
  const didRemove = queryResult.rowCount === 1;

  if (didRemove) {
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/DELETE#responses
    // we've gone for '200 response with JSON body' to respond to a DELETE
    //  but 204 with no response body is another alternative:
    //  res.status(204).send() to send with status 204 and no JSON body
    res.status(200).json({
      status: "success",
    });
  } else {
    res.status(404).json({
      status: "fail",
      data: {
        id: "Could not find a signature with that id identifier",
      },
    });
  }
});

export default app;
