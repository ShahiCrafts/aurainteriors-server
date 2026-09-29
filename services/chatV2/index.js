const {loadChatConfig}=require('./config/chatConfig');const Pipeline=require('./core/pipeline');const KeyedTurnQueue=require('./queue/keyedTurnQueue');
const config=loadChatConfig();const pipeline=new Pipeline(config);const queue=new KeyedTurnQueue();module.exports={config,pipeline,queue};
