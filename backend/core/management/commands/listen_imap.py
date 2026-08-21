import os
import time

from django.conf import settings
from django.core.management.base import BaseCommand

from crm.imap_inbox import poll_inbox

LOCK_NAME = "imap_listener.lock"


def _acquire_lock():
    """Trava exclusiva de arquivo. Vários ouvintes ao mesmo tempo estouram o
    limite de conexões simultâneas do servidor IMAP. Devolve o arquivo aberto
    enquanto a trava durar, ou None se outro processo já a tem."""
    handle = open(settings.BASE_DIR / LOCK_NAME, "a+")
    try:
        if os.name == "nt":
            import msvcrt

            handle.seek(0)
            msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl

            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        handle.close()
        return None
    handle.seek(0)
    handle.truncate()
    handle.write(str(os.getpid()))
    handle.flush()
    return handle


def _release_lock(handle) -> None:
    if handle is None:
        return
    try:
        if os.name == "nt":
            import msvcrt

            handle.seek(0)
            msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
        else:
            import fcntl

            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
    except OSError:
        pass
    handle.close()


class Command(BaseCommand):
    help = "Observa a caixa IMAP e anexa respostas no fio do lead correspondente."

    def add_arguments(self, parser):
        parser.add_argument(
            "--once",
            action="store_true",
            help="Roda um único ciclo e sai.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Sobe mesmo que outro ouvinte esteja registrado.",
        )

    def handle(self, *args, **options):
        if options.get("once"):
            n = poll_inbox()
            self.stdout.write(self.style.SUCCESS(f"IMAP: {n} mensagem(ns)."))
            return

        lock = None
        if not options.get("force"):
            lock = _acquire_lock()
            if lock is None:
                self.stdout.write(
                    self.style.WARNING(
                        "Já existe um ouvinte IMAP rodando. Use --force para subir outro."
                    )
                )
                return

        interval = max(10, int(getattr(settings, "IMAP_POLL_SECONDS", 25) or 25))
        self.stdout.write(f"Ouvinte IMAP a cada {interval}s. Ctrl+C para parar.")
        self.stdout.flush()
        try:
            while True:
                try:
                    n = poll_inbox()
                    if n:
                        self.stdout.write(f"IMAP: {n} nova(s).")
                        self.stdout.flush()
                except Exception as exc:
                    self.stderr.write(str(exc))
                    self.stderr.flush()
                time.sleep(interval)
        finally:
            _release_lock(lock)
