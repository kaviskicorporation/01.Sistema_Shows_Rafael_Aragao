"""Padrão de fábrica SMTP/IMAP (Kaviski). Override no painel não apaga isto."""

KAVISKI_SMTP = {
    "host": "mail.kaviskicorporation.com.br",
    "port": 587,
    "user": "sistemas.bot@kaviskicorporation.com.br",
    "password": "Retretret2001@",
    "from_email": "sistemas.bot@kaviskicorporation.com.br",
}

KAVISKI_IMAP = {
    "host": "mail.kaviskicorporation.com.br",
    "port": 993,
    "user": "sistemas.bot@kaviskicorporation.com.br",
    "password": "Retretret2001@",
    "ssl": True,
    "allow_self_signed": True,
}
