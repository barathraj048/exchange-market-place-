import {createClient} from "redis"


const redisClient = createClient()
await redisClient.connect()
while(true){
    let value = await redisClient.rPop("message")
    if(value){
      engine.process(JSON.parse(value))
    }
}