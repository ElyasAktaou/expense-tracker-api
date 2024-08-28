// create transaction schema
import mongoose from 'mongoose';
const transactionSchema = new mongoose.Schema({
  label: {
    type: String,
    required: false
  },
  description: {
    type: String,
    required: false
  },
  date: {
    type: Date,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['income', 'expense']
  }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;