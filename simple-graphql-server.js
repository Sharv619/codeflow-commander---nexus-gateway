import express from 'express';
const app = express();

app.use(express.json());

app.use('/graphql', (req, res) => {
  res.json({
    data: {
      health: "ok",
      message: "Mock GraphQL service active"
    }
  });
});

const port = 4000;
app.listen(port, () => {
  console.log(`Mock GraphQL server running on port ${port}`);
});
