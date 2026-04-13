const bcrypt = require('bcryptjs');
bcrypt.compare('password123', '$2a$10$m8T9vDGsWUjIjfvwB0b3mOPqElHQqEiSFvUEF3GxGNgF/bTTz4hQy').then(res => console.log('Match?', res));
