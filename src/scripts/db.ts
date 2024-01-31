import * as readline from "readline";
import { defaultDataSource } from "../reader/models";

async function main() {
    const args = process.argv.slice(2);
    if(args[0] == 'reset-db') {
        const confirm = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })
        confirm.question('Are you sure you want to reset the database? All the data will be lost. \n\n', async function(yesOrNo) {
            if(yesOrNo == 'YES') {
                const dataSource = await defaultDataSource.initialize()
                await dataSource.synchronize(true)
                console.log('DELETED...')
            }
            confirm.close()
        })
    }
}

if (require.main.filename === __filename) {
    main()
}
