// Database Templates for No-Code Builder
// Pre-built templates that clients can use to quickly create databases

const DATABASE_TEMPLATES = {
  // Personal Templates
  'contact-list': {
    id: 'contact-list',
    name: 'Contact List',
    category: 'Personal',
    description: 'Store names, phone numbers, emails, and addresses for your contacts',
    icon: '👤',
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true, default: '' },
      { name: 'phone', type: 'phone', label: 'Phone Number', required: false, default: '' },
      { name: 'email', type: 'email', label: 'Email Address', required: false, default: '' },
      { name: 'address', type: 'text', label: 'Address', required: false, default: '' },
      { name: 'notes', type: 'text', label: 'Notes', required: false, default: '' }
    ],
    sampleData: [
      { name: 'John Doe', phone: '555-0101', email: 'john@example.com', address: '123 Main St', notes: 'Friend from work' },
      { name: 'Jane Smith', phone: '555-0102', email: 'jane@example.com', address: '456 Oak Ave', notes: 'Neighbor' },
      { name: 'Bob Johnson', phone: '555-0103', email: 'bob@example.com', address: '', notes: 'Met at conference' }
    ],
    instructions: 'Use this template to keep track of all your contacts. Add new contacts by clicking the "Add New" button.'
  },

  'recipe-collection': {
    id: 'recipe-collection',
    name: 'Recipe Collection',
    category: 'Personal',
    description: 'Organize your favorite recipes with ingredients and instructions',
    icon: '🍳',
    fields: [
      { name: 'name', type: 'text', label: 'Recipe Name', required: true, default: '' },
      { name: 'category', type: 'text', label: 'Category', required: false, default: '' },
      { name: 'ingredients', type: 'text', label: 'Ingredients', required: false, default: '' },
      { name: 'instructions', type: 'text', label: 'Instructions', required: false, default: '' },
      { name: 'cooking_time', type: 'number', label: 'Cooking Time (minutes)', required: false, default: '' },
      { name: 'servings', type: 'number', label: 'Servings', required: false, default: '' }
    ],
    sampleData: [
      { name: 'Chocolate Chip Cookies', category: 'Dessert', ingredients: 'Flour, sugar, chocolate chips', instructions: 'Mix and bake', cooking_time: 30, servings: 24 },
      { name: 'Spaghetti Carbonara', category: 'Main Course', ingredients: 'Pasta, eggs, bacon, cheese', instructions: 'Cook pasta, mix with sauce', cooking_time: 20, servings: 4 }
    ],
    instructions: 'Store all your favorite recipes here. Add the recipe name, category, ingredients, and step-by-step instructions.'
  },

  'family-records': {
    id: 'family-records',
    name: 'Family Records',
    category: 'Personal',
    description: 'Keep track of family members and their information',
    icon: '👨‍👩‍👧‍👦',
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true, default: '' },
      { name: 'relation', type: 'text', label: 'Relation', required: false, default: '' },
      { name: 'birthday', type: 'date', label: 'Birthday', required: false, default: '' },
      { name: 'address', type: 'text', label: 'Address', required: false, default: '' },
      { name: 'phone', type: 'phone', label: 'Phone', required: false, default: '' },
      { name: 'email', type: 'email', label: 'Email', required: false, default: '' },
      { name: 'notes', type: 'text', label: 'Notes', required: false, default: '' }
    ],
    sampleData: [
      { name: 'John Smith', relation: 'Brother', birthday: '1975-05-15', address: '123 Main St', phone: '555-0101', email: 'john@example.com', notes: 'Lives in California' },
      { name: 'Mary Smith', relation: 'Sister', birthday: '1980-08-22', address: '456 Oak Ave', phone: '555-0102', email: 'mary@example.com', notes: 'Has two kids' }
    ],
    instructions: 'Maintain a record of your family members. Add their names, relationships, birthdays, and contact information.'
  },

  'book-collection': {
    id: 'book-collection',
    name: 'Book Collection',
    category: 'Personal',
    description: 'Catalog your books with titles, authors, and ratings',
    icon: '📚',
    fields: [
      { name: 'title', type: 'text', label: 'Title', required: true, default: '' },
      { name: 'author', type: 'text', label: 'Author', required: false, default: '' },
      { name: 'year', type: 'number', label: 'Year Published', required: false, default: '' },
      { name: 'rating', type: 'number', label: 'Rating (1-5)', required: false, default: '' },
      { name: 'status', type: 'text', label: 'Status', required: false, default: 'Unread' },
      { name: 'notes', type: 'text', label: 'Notes', required: false, default: '' }
    ],
    sampleData: [
      { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', year: 1925, rating: 5, status: 'Read', notes: 'Classic American novel' },
      { title: 'To Kill a Mockingbird', author: 'Harper Lee', year: 1960, rating: 5, status: 'Read', notes: 'Powerful story about justice' }
    ],
    instructions: 'Keep track of books you\'ve read or want to read. Add the title, author, and your personal rating.'
  },

  // Business Templates
  'customer-database': {
    id: 'customer-database',
    name: 'Customer Database',
    category: 'Business',
    description: 'Manage customer information and contact history',
    icon: '💼',
    fields: [
      { name: 'name', type: 'text', label: 'Customer Name', required: true, default: '' },
      { name: 'company', type: 'text', label: 'Company', required: false, default: '' },
      { name: 'email', type: 'email', label: 'Email', required: false, default: '' },
      { name: 'phone', type: 'phone', label: 'Phone', required: false, default: '' },
      { name: 'address', type: 'text', label: 'Address', required: false, default: '' },
      { name: 'last_contact', type: 'date', label: 'Last Contact Date', required: false, default: '' },
      { name: 'notes', type: 'text', label: 'Notes', required: false, default: '' }
    ],
    sampleData: [
      { name: 'Acme Corp', company: 'Acme Corporation', email: 'contact@acme.com', phone: '555-1001', address: '789 Business Blvd', last_contact: '2024-01-15', notes: 'Regular client' },
      { name: 'Tech Solutions Inc', company: 'Tech Solutions', email: 'info@techsol.com', phone: '555-1002', address: '321 Tech Park', last_contact: '2024-01-10', notes: 'New client' }
    ],
    instructions: 'Manage your customer relationships. Track customer information and when you last contacted them.'
  },

  'inventory-tracker': {
    id: 'inventory-tracker',
    name: 'Inventory Tracker',
    category: 'Business',
    description: 'Track products, quantities, and suppliers',
    icon: '📦',
    fields: [
      { name: 'item_name', type: 'text', label: 'Item Name', required: true, default: '' },
      { name: 'quantity', type: 'number', label: 'Quantity', required: true, default: 0 },
      { name: 'price', type: 'number', label: 'Price per Unit', required: false, default: '' },
      { name: 'supplier', type: 'text', label: 'Supplier', required: false, default: '' },
      { name: 'location', type: 'text', label: 'Location', required: false, default: '' },
      { name: 'reorder_level', type: 'number', label: 'Reorder Level', required: false, default: 10 },
      { name: 'notes', type: 'text', label: 'Notes', required: false, default: '' }
    ],
    sampleData: [
      { item_name: 'Widget A', quantity: 150, price: 12.99, supplier: 'ABC Supplies', location: 'Warehouse A', reorder_level: 50, notes: 'Fast moving item' },
      { item_name: 'Widget B', quantity: 45, price: 8.50, supplier: 'XYZ Distributors', location: 'Warehouse B', reorder_level: 30, notes: 'Reorder soon' }
    ],
    instructions: 'Keep track of your inventory. Monitor quantities and set reorder levels to know when to restock.'
  },

  'appointment-calendar': {
    id: 'appointment-calendar',
    name: 'Appointment Calendar',
    category: 'Business',
    description: 'Schedule and manage appointments with clients',
    icon: '📅',
    fields: [
      { name: 'title', type: 'text', label: 'Appointment Title', required: true, default: '' },
      { name: 'date', type: 'date', label: 'Date', required: true, default: '' },
      { name: 'time', type: 'text', label: 'Time', required: false, default: '' },
      { name: 'client_name', type: 'text', label: 'Client Name', required: false, default: '' },
      { name: 'location', type: 'text', label: 'Location', required: false, default: '' },
      { name: 'status', type: 'text', label: 'Status', required: false, default: 'Scheduled' },
      { name: 'notes', type: 'text', label: 'Notes', required: false, default: '' }
    ],
    sampleData: [
      { title: 'Consultation', date: '2024-02-01', time: '10:00 AM', client_name: 'John Doe', location: 'Office', status: 'Scheduled', notes: 'Initial meeting' },
      { title: 'Follow-up Call', date: '2024-02-05', time: '2:00 PM', client_name: 'Jane Smith', location: 'Phone', status: 'Scheduled', notes: 'Discuss proposal' }
    ],
    instructions: 'Schedule your appointments. Add the date, time, client name, and any notes about the meeting.'
  },

  'expense-tracker': {
    id: 'expense-tracker',
    name: 'Expense Tracker',
    category: 'Business',
    description: 'Track business expenses and receipts',
    icon: '💰',
    fields: [
      { name: 'date', type: 'date', label: 'Date', required: true, default: '' },
      { name: 'description', type: 'text', label: 'Description', required: true, default: '' },
      { name: 'amount', type: 'number', label: 'Amount', required: true, default: 0 },
      { name: 'category', type: 'text', label: 'Category', required: false, default: '' },
      { name: 'payment_method', type: 'text', label: 'Payment Method', required: false, default: '' },
      { name: 'receipt_url', type: 'text', label: 'Receipt URL', required: false, default: '' },
      { name: 'notes', type: 'text', label: 'Notes', required: false, default: '' }
    ],
    sampleData: [
      { date: '2024-01-15', description: 'Office supplies', amount: 125.50, category: 'Office', payment_method: 'Credit Card', receipt_url: '', notes: 'Staples purchase' },
      { date: '2024-01-20', description: 'Client lunch', amount: 45.00, category: 'Meals', payment_method: 'Credit Card', receipt_url: '', notes: 'Business development' }
    ],
    instructions: 'Record all your business expenses. Include the date, description, amount, and category for easy tracking.'
  },

  // Simple Lists
  'todo-list': {
    id: 'todo-list',
    name: 'To-Do List',
    category: 'Simple Lists',
    description: 'Keep track of tasks and priorities',
    icon: '✅',
    fields: [
      { name: 'task', type: 'text', label: 'Task', required: true, default: '' },
      { name: 'priority', type: 'text', label: 'Priority', required: false, default: 'Medium' },
      { name: 'due_date', type: 'date', label: 'Due Date', required: false, default: '' },
      { name: 'completed', type: 'boolean', label: 'Completed', required: false, default: false },
      { name: 'notes', type: 'text', label: 'Notes', required: false, default: '' }
    ],
    sampleData: [
      { task: 'Finish project report', priority: 'High', due_date: '2024-02-01', completed: false, notes: 'Need to review with team' },
      { task: 'Call dentist', priority: 'Medium', due_date: '2024-02-05', completed: false, notes: 'Schedule appointment' },
      { task: 'Buy groceries', priority: 'Low', due_date: '2024-01-30', completed: true, notes: 'Done yesterday' }
    ],
    instructions: 'Organize your tasks. Mark items as completed when done, and set priorities to focus on what\'s important.'
  },

  'shopping-list': {
    id: 'shopping-list',
    name: 'Shopping List',
    category: 'Simple Lists',
    description: 'Create and manage your shopping lists',
    icon: '🛒',
    fields: [
      { name: 'item', type: 'text', label: 'Item', required: true, default: '' },
      { name: 'quantity', type: 'number', label: 'Quantity', required: false, default: 1 },
      { name: 'store', type: 'text', label: 'Store', required: false, default: '' },
      { name: 'purchased', type: 'boolean', label: 'Purchased', required: false, default: false },
      { name: 'notes', type: 'text', label: 'Notes', required: false, default: '' }
    ],
    sampleData: [
      { item: 'Milk', quantity: 2, store: 'Grocery Store', purchased: false, notes: 'Whole milk' },
      { item: 'Bread', quantity: 1, store: 'Grocery Store', purchased: false, notes: 'Whole wheat' },
      { item: 'Eggs', quantity: 1, store: 'Grocery Store', purchased: true, notes: 'Already bought' }
    ],
    instructions: 'Create your shopping list. Add items, quantities, and mark them as purchased when you buy them.'
  },

  'event-planner': {
    id: 'event-planner',
    name: 'Event Planner',
    category: 'Simple Lists',
    description: 'Plan and organize events',
    icon: '🎉',
    fields: [
      { name: 'event_name', type: 'text', label: 'Event Name', required: true, default: '' },
      { name: 'date', type: 'date', label: 'Date', required: true, default: '' },
      { name: 'time', type: 'text', label: 'Time', required: false, default: '' },
      { name: 'location', type: 'text', label: 'Location', required: false, default: '' },
      { name: 'attendees', type: 'text', label: 'Attendees', required: false, default: '' },
      { name: 'status', type: 'text', label: 'Status', required: false, default: 'Planning' },
      { name: 'notes', type: 'text', label: 'Notes', required: false, default: '' }
    ],
    sampleData: [
      { event_name: 'Birthday Party', date: '2024-02-15', time: '6:00 PM', location: 'Home', attendees: 'Family and friends', status: 'Planning', notes: 'John\'s 50th birthday' },
      { event_name: 'Team Meeting', date: '2024-02-10', time: '10:00 AM', location: 'Conference Room', attendees: 'Team members', status: 'Confirmed', notes: 'Q1 planning session' }
    ],
    instructions: 'Plan your events. Add the event name, date, location, and list of attendees.'
  }
};

// Helper function to get templates by category
function getTemplatesByCategory() {
  const categorized = {
    'Personal': [],
    'Business': [],
    'Simple Lists': []
  };
  
  Object.values(DATABASE_TEMPLATES).forEach(template => {
    if (categorized[template.category]) {
      categorized[template.category].push(template);
    }
  });
  
  return categorized;
}

// Helper function to get template by ID
function getTemplateById(templateId) {
  return DATABASE_TEMPLATES[templateId] || null;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DATABASE_TEMPLATES, getTemplatesByCategory, getTemplateById };
}

// Make available globally
window.DATABASE_TEMPLATES = DATABASE_TEMPLATES;
window.getTemplatesByCategory = getTemplatesByCategory;
window.getTemplateById = getTemplateById;

