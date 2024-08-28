// CATEGORY ROUTES

import express from 'express';

import Category from '../models/Category.js';

const categoryRouter = express.Router();

// categories crud
categoryRouter.get('/', async (req, res) => {
  try {
    const categories = await Category.find({});
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
})

categoryRouter.post('/', async (req, res) => {
  const category = new Category({
    name: req.body.name,
    color: req.body.color
  });
  
  try {
    const newCategory = await category.save();
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

categoryRouter.get('/:id', getCategory, (req, res) => {
  res.json(res.category);
});

categoryRouter.put('/:id', getCategory, async (req, res) => {
  if (req.body.name != null) {
    res.category.name = req.body.name;
  }
  if (req.body.color != null) {
    res.category.color = req.body.color;
  }
  
  try {
    const updatedCategory = await res.category.save();
    res.json(updatedCategory);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

categoryRouter.delete('/:id', getCategory, async (req, res) => {
  try {
    await res.category.remove();
    res.json({ message: 'Deleted category' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

async function getCategory(req, res, next) {
  let category;
  try {
    category = await Category.findById(req.params.id);
    if (category == null) {
      return res.status(404).json({ message: 'Cannot find category' });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
  
  res.category = category;
  next();
};

export default categoryRouter;