import {createClient} from "redis"
import { Engine } from "./trades/engine"

const engine =new Engine()
const redisClient = createClient()
await redisClient.connect()
while(true){
    let value = await redisClient.rPop("message")
    if(value){
    engine.process(JSON.parse(value))
    }
}