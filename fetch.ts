fetch('http://localhost:3000/api/state').then(r => r.text()).then(console.log).catch(console.error);
