from django.db import migrations


EXTRA_FAQS = [
    (
        "O show inclui equipe e estrutura de palco?",
        "O Rafael viaja com equipe. Som, luz e palco dependem do porte da casa e entram na proposta. "
        "No formulário, descreva o espaço — isso agiliza o orçamento.",
    ),
    (
        "O que acontece depois que eu envio o formulário?",
        "A equipe confirma o recebimento, avalia a data e retorna com disponibilidade e os próximos passos. "
        "Se faltar algum dado, pedimos o complemento por e-mail.",
    ),
]


def add_extra_faqs(apps, schema_editor):
    FaqItem = apps.get_model("core", "FaqItem")
    last = FaqItem.objects.order_by("-order").first()
    start = (last.order + 1) if last else 0
    existing = set(FaqItem.objects.values_list("question", flat=True))
    order = start
    for question, answer in EXTRA_FAQS:
        if question in existing:
            continue
        FaqItem.objects.create(
            question=question,
            answer=answer,
            order=order,
            is_active=True,
        )
        order += 1


def remove_extra_faqs(apps, schema_editor):
    FaqItem = apps.get_model("core", "FaqItem")
    questions = [q for q, _ in EXTRA_FAQS]
    FaqItem.objects.filter(question__in=questions).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0015_faqitem_and_faq_titles"),
    ]

    operations = [
        migrations.RunPython(add_extra_faqs, remove_extra_faqs),
    ]
