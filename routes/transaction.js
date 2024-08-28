import express from 'express';
import Transaction from '../models/Transaction.js';
import multer from "multer"
import { GoogleAIFileManager } from "@google/generative-ai/server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import config from '../config.js';





const transactionRouter = express.Router();

// Using multer to handle the file upload, not specifying the destination means tmp folder of the OS will be used with a random name
const upload = multer({ storage: multer.diskStorage({}) });

// transactions crud
transactionRouter.get('/', async (req, res) => {
  try {
    const transactions = await Transaction.find({}).populate('category');
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
})

transactionRouter.post('/', async (req, res) => {
  const transaction = new Transaction({
    label: req.body.label,
    description: req.body.description,
    date: req.body.date,
    amount: req.body.amount,
    category: req.body.category,
    type: req.body.type
  });

  try {
    const newTransaction = await transaction.save();
    res.status(201).json(newTransaction);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// transactionRouter.get('/:id', getTransaction, (req, res) => {
//   res.json(res.transaction);
// })

transactionRouter.delete('/:id', getTransaction, async (req, res) => {
  try {
    await res.transaction.remove();
    res.json({ message: 'Deleted transaction' });
  }
  catch (error) {
    res.status(500).json({ message: error.message });
  }
})

async function getTransaction(req, res, next) {
  let transaction;
  try {
    transaction = await Transaction.findById(req.params.id);
    if (transaction == null) {
      return res.status(404).json({ message: 'Cannot find transaction' });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }

  res.transaction = transaction;
  next();
}

// route to get current balance
transactionRouter.get('/current-balance', async (req, res) => {
  try {
    // use aggregation framework to calculate balance
    const resp = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          balance: { $sum: { $cond: { if: { $eq: ["$type", "income"] }, then: "$amount", else: { $multiply: ["$amount", -1] } } } }
        }
      }
    ])
    res.json({ balance: resp?.[0]?.balance ?? 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
})

// route to get total income for the year
transactionRouter.get('/total-income', async (req, res) => {
  try {
    const resp = await Transaction.aggregate([
      {
        $match: {
          type: 'income',
          date: {
            $gte: new Date(new Date().getFullYear(), 0, 1),
            $lt: new Date(new Date().getFullYear() + 1, 0, 1)
          }
        }
      },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: "$amount" }
        }
      }
    ]);
    res.json({ totalIncome: resp?.[0]?.totalIncome ?? 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
})

// route to get total expense for the year
transactionRouter.get('/total-expense', async (req, res) => {
  try {
    const resp = await Transaction.aggregate([
      {
        $match: {
          type: 'expense',
          date: {
            $gte: new Date(new Date().getFullYear(), 0, 1),
            $lt: new Date(new Date().getFullYear() + 1, 0, 1)
          }
        }
      },
      {
        $group: {
          _id: null,
          totalExpense: { $sum: "$amount" }
        }
      }
    ]);
    res.json({ totalExpense: resp?.[0]?.totalExpense ?? 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
})

// route to get total expense by category for the year
transactionRouter.get('/total-expense-by-category', async (req, res) => {
  try {
    const resp = await Transaction.aggregate([
      {
        $match: {
          type: 'expense',
          date: {
            $gte: new Date(new Date().getFullYear(), 0, 1),
            $lt: new Date(new Date().getFullYear() + 1, 0, 1)
          }
        }
      },
      {
        $group: {
          _id: "$category",
          totalExpense: { $sum: "$amount" }
        }
      },
      // join with category collection
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category"
        }
      },
      {
        $unwind: "$category"
      },
      {
        $project: {
          _id: 0,
          category: "$category.label",
          totalExpense: 1
        }
      }
    ]);
    res.json({pieChartData: resp});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
})

// route to get total income and expense by month for current year, months with no data will be included
transactionRouter.get('/income-expense-totals-by-month', async (req, res) => {
  try {
    const resp = await Transaction.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(new Date().getFullYear(), 0, 1),
            $lt: new Date(new Date().getFullYear() + 1, 0, 1)
          }
        }
      },
      {
        $group: {
          _id: { $month: "$date" },
          totalIncome: { $sum: { $cond: { if: { $eq: ["$type", "income"] }, then: "$amount", else: 0 } } },
          totalExpense: { $sum: { $cond: { if: { $eq: ["$type", "expense"] }, then: "$amount", else: 0 } } }
        }
      },
      {
        $project: {
          _id: 0,
          month: "$_id",
          totalIncome: 1,
          totalExpense: 1
        }
      }
    ]);
    // add months with no data
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const data = months.map(month => {
      const monthData = resp.find(d => d.month === month);
      return {
        month,
        totalIncome: monthData?.totalIncome ?? 0,
        totalExpense: monthData?.totalExpense ?? 0
      }
    });
    // sort by month
    data.sort((a, b) => a.month - b.month);
    // replace months with month names
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    data.forEach(d => d.month = monthNames[d.month - 1]);
    res.json({barChartData: data});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
})

transactionRouter.route("/ocr").post(upload.single("file"), async (req, res) => {
  const { file } = req;
  if (!file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  console.log(file.path);
  console.log(file.mimetype);
  console.log(file.originalname);
  // Initialize GoogleGenerativeAI with your API_KEY.
  const genAI = new GoogleGenerativeAI(config.API_KEY);


  const model = genAI.getGenerativeModel({
    // Choose a Gemini model.
    model: "gemini-1.5-pro",
  });

  // upload to google generative ai
  // Initialize GoogleAIFileManager with your API_KEY.
  const fileManager = new GoogleAIFileManager(config.API_KEY);

  // Upload a file to Google AI using google AI file manager
  const uploadResponse = await fileManager.uploadFile(file.path, {
    // Specify the MIME type of the file.
    mimeType: file.mimetype,
    displayName: file.originalname,
  });

  
  // Generate content using text and the URI reference for the uploaded file.
  const result = await model.generateContent([
      {
        fileData: {
          mimeType: uploadResponse.file.mimeType,
          fileUri: uploadResponse.file.uri
        }
      },
      { text: `Return a json object in the following form:
      {
        label: "A suiting label for this expense",
        description: "A short description of the expense",
        date: "The date of the expense",
        amount: "Total amount of the expense",
        currency: "Currency of the amount",
        category: "A suiting category of the expense",
        business: "Name of the store where the expense was made",
      }`}
  ]);
  console.log(result.response.text());  
  // Output the generated text to the console
  res.json({res: result.response.text()})
})


export default transactionRouter;