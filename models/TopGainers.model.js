const mongoose = require('mongoose')

const cryptoSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
    },
    symbolImage: {
      type: String, // You can use String to store the image URL or file path
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    percentageChange: {
      type: Number,
      required: true,
    },
    link: {
      type: String,
      required: true,
    },
  });
  
  const TopGainers = mongoose.model('TopGainers', cryptoSchema);

  module.exports = TopGainers