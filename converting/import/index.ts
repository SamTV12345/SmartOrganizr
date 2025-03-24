import mysql from 'mysql2';
import fs from 'fs';
const connection = mysql.createConnection({
    host: '192.168.1.21',
    user: 'root',
    password: 'i9cBp39pthrMqKGpaJch2MWrcUSMX6',
    database: 'smartorganizr'
});


connection.connect()

/*const contentOfAuthors = fs.readFileSync('../authorRes.json', 'utf-8')
const authors = JSON.parse(contentOfAuthors)

for (const author of authors) {
    connection.query('INSERT INTO authors (id, extra_information,name, user_id_fk ) VALUES (?, ?, ?,?)', [author.id, author.extra_information, author.name, author.user_id_fk], (error, results, fields) => {
        if (error) {
            console.error(error)
        }
    })
}*/




const contentOfElements = fs.readFileSync('../elementsRes.json', 'utf-8')
const elements = JSON.parse(contentOfElements)

for (const element of elements) {
    connection.query("INSERT INTO elements(type,id,creation_date, description, name,number_of_pages, title, user_id_fk, parent, author_id_fk, pdf_content ) VALUES (?,?,?,?,?,?,?,?,?,?,?)", [element.type, element.id, element.creation_date, element.description, element.name, element.number_of_pages, element.title, element.user_id_fk, element.parent, element.author_id_fk, element.pdf_content], (error, results, fields) => {
        if (error) {
            console.error(error)
        }
    })
}