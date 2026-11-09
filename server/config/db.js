const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI no está definida en las variables de entorno');
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB desconectado');
  });

  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log(`MongoDB conectado: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
};

module.exports = connectDB;