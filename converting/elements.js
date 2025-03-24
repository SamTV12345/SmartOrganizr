const fs = require('fs');

const json = JSON.parse(fs.readFileSync('./elements.json').toString())
const jsonAuthor = JSON.parse(fs.readFileSync('./authors.json').toString())
const map = new Map();
const authorMap = new Map();

const data = json[2].data
const authorData = jsonAuthor[2].data

for (let author of authorData) {
    const uuidToAssign = crypto.randomUUID();
    authorMap.set(author.id, uuidToAssign)
    author.id = uuidToAssign
}

for (let dataInternal of data) {
    const uuidToAssign = crypto.randomUUID();
    map.set(dataInternal.id, uuidToAssign)
    dataInternal.id = uuidToAssign
    dataInternal.number_of_pages = parseInt(dataInternal.number_of_pages)
    dataInternal.pdf_available = dataInternal.pdf_available === '1'
    if (isNaN(dataInternal.number_of_pages)) {
        delete dataInternal.number_of_pages
    }
    if (dataInternal.author_id_fk != null) {
        dataInternal.author_id_fk = authorMap.get(dataInternal.author_id_fk)
    }
}

for (let dataInternal of data) {
    if (dataInternal.parent) {
        dataInternal.parent = map.get(dataInternal.parent)
    }
}

data.sort((a,b)=>{
    if (a.parent == null && b.parent == null) {
        return 0
    }
    if (a.parent == null) {
        return -1
    }
    if (b.parent == null) {
        return 1
    }
})

const header = json[0]
const headerAuthor = authorData[0]
let csvAuthor = Object.keys(headerAuthor).join(";") +"\n"

for (let author of authorData) {
    csvAuthor += Object.keys(author).map(key => author[key]).join(";") + "\n"
}

let headers = {};
for (let elements of data) {
    console.log(elements.type == "Note")
    if (elements.type == "Note") {
        Object.keys(elements).forEach(note=>{
            headers[note] = true
        })
    }
}

console.log("Headers are", headers)
let csvElements = Object.keys(headers).join(";") +"\n"

for (let elements of data) {
    csvElements += Object.keys(elements).map(key => elements[key]).join(";") + "\n"
}

fs.writeFileSync("./authors.csv", csvAuthor)
fs.writeFileSync("./elements.csv", csvElements)