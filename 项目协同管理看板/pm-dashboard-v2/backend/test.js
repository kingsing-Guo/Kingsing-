fetch('http://localhost:3000/api/modules')
    .then(r => r.json())
    .then(data => {
        console.log("Modules before:", JSON.stringify(data.data[0]));
        return fetch(`http://localhost:3000/api/modules/${data.data[0].id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history: [{ time: '123', content: 'test' }] })
        }).then(r => r.json()).then(res => {
            console.log("PUT result:", res);
        });
    })
    .catch(console.error);
