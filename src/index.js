const { promises: fs } = require('fs')

const delay = time => new Promise(resolve => setTimeout(resolve, time))

async function *read() {
    yield "Hello";
    await delay(1000) 
    yield "World";
    await delay(1000);
    yield "Unicorn";
}

async function *readFile(path, { flags = 'r', mode = 0o666,  highWaterMark = 64 * 1024 } = {}) {
    let handle;
    let read;
    try {
        handle = await fs.open(path, flags, mode)
        const buf = Buffer.allocUnsafe(highWaterMark)
        while ((read = (await handle.read(buf, 0, highWaterMark)).bytesRead) > 0)
            yield buf.slice(0, read)
    } finally {
        handle && await handle.close()
    }
}

function writeFile(path, { flags = 'w', mode = 0o666 } = {}) {
    return async input => {
        let handle;
        try {
            handle = await fs.open(path, flags, mode)
            for await (const buf of input) {
                const len = Buffer.byteLength(buf)
                let toWrite = len;
                while(toWrite > 0) {
                    toWrite -= (await handle.write(buf, len - toWrite, toWrite)).bytesWritten
                }
            }
        } finally {
            handle && await handle.close()
        }
    }
}

function *duplicate(input) {
    let dups = 0
    let nextElem
    let resLock
    let lock = new Promise(resolve => resLock = resolve)
    let i = 0
    let waiters = []

    const sendToAll = async data => {
        await lock
        lock = new Promise(resolve => resLock = resolve)
        waiters.forEach(([res]) => res(data))
        waiters = []
    }

    const next = () => {
        if (++i === dups)
            resLock()
        return new Promise((res, rej) => waiters.push([res, rej]))
    }

    void async function() {
        try {
            for await (const value of input) {
               await sendToAll({ value })
            }
            await sendToAll({ done: true })
        } catch(e) {
            await lock
            waiters.forEach(([, rej]) => rej(e))
        }
    }()

    while(true) {
        dups++
        yield {
            [Symbol.asyncIterator]() {
                return this
            },

            next() {
                return next()
            },

            close() {
                dups--
            }
        }
    }
}

async function *transform(input) {
    for await (const data of input) {
        yield data.toString().toUpperCase()
    }
}


async function write(input) {
    for await (const data of input) {
        //console.log(data.length)
        process.stdout.write(data)
    }
}

void async function () {
    const [s1, s2, s3] = readFile('package.json') |> transform |> duplicate
    await Promise.all([
        s1 |> write,
        s2 |> writeFile('test'),
        s3 |> writeFile('test2')
    ])
    console.log('END')
}()
