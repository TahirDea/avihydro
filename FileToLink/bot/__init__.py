from ..config import Telegram
from hydrogram import Client

if Telegram.SECONDARY:
    plugins=None
    no_updates=True
else:    
    plugins={"root": "FileToLink/bot/plugins"}
    no_updates=None

FileToLink = Client(
    name="FileToLink",
    api_id=Telegram.API_ID,
    api_hash=Telegram.API_HASH,
    workdir="FileToLink",
    plugins=plugins,
    bot_token=Telegram.BOT_TOKEN,
    sleep_threshold=Telegram.SLEEP_THRESHOLD,
    workers=Telegram.WORKERS,
    no_updates=no_updates
)

multi_clients = {}
work_loads = {}

