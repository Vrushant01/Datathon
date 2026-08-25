const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/ksp_datathon'); // Or whatever the DB URI is
mongoose.connection.on('open', async () => {
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(collections.map(c => c.name));
    process.exit(0);
});
