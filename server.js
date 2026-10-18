const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`✓ Practical 13 AI Integration Server running at http://localhost:${PORT}`);
});
