from django.db import migrations, models


SAMPLE_FAQS = [
    (
        "Como faço para contratar o Rafael Aragão para um evento?",
        "Preencha o formulário de contratação acima com data, cidade e tipo de evento. "
        "A equipe responde por e-mail para alinhar disponibilidade e os próximos passos.",
    ),
    (
        "Vocês atendem eventos corporativos, prefeituras e teatros?",
        "Sim. O espetáculo Rei dos Peão circula em teatros, eventos corporativos, "
        "prefeituras e datas especiais. Informe o formato no campo de tipo de evento.",
    ),
    (
        "Como acompanho as datas da turnê?",
        "A agenda desta página mostra os shows já confirmados. Se a sua cidade ainda "
        "não aparece, solicite uma data pelo formulário — a equipe avalia a inclusão na rota.",
    ),
    (
        "Qual o prazo ideal para solicitar um show?",
        "O quanto antes, melhor. Em alta temporada o ideal é com alguns meses de "
        "antecedência para encaixar deslocamento, equipe e palco.",
    ),
    (
        "Como funciona cachê e forma de pagamento?",
        "Os valores dependem de data, cidade e estrutura do evento. Depois do primeiro "
        "contato a equipe envia uma proposta. Para falar direto, use o e-mail do rodapé "
        "ou o Instagram <a href=\"https://www.instagram.com/rafaelaragaooficial\">@rafaelaragaooficial</a>.",
    ),
    (
        "Posso contratar um evento fechado ou particular?",
        "Sim. Eventos fechados, confraternizações e datas corporativas seguem o mesmo "
        "fluxo: formulário acima → contato da equipe → proposta.",
    ),
]


def seed_faqs(apps, schema_editor):
    FaqItem = apps.get_model("core", "FaqItem")
    if FaqItem.objects.exists():
        return
    for i, (question, answer) in enumerate(SAMPLE_FAQS):
        FaqItem.objects.create(
            question=question,
            answer=answer,
            order=i,
            is_active=True,
        )


def unseed_faqs(apps, schema_editor):
    FaqItem = apps.get_model("core", "FaqItem")
    FaqItem.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0014_emailsettings"),
    ]

    operations = [
        migrations.AddField(
            model_name="siteconfig",
            name="faq_eyebrow",
            field=models.CharField(blank=True, default="Dúvidas", max_length=80),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="faq_title",
            field=models.CharField(
                blank=True, default="Perguntas frequentes", max_length=120
            ),
        ),
        migrations.CreateModel(
            name="FaqItem",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("question", models.CharField(max_length=300)),
                (
                    "answer",
                    models.TextField(
                        help_text="Texto da resposta. URLs viram link; HTML <a href> também vale."
                    ),
                ),
                ("order", models.PositiveIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Pergunta do FAQ",
                "verbose_name_plural": "FAQ",
                "ordering": ["order", "id"],
            },
        ),
        migrations.RunPython(seed_faqs, unseed_faqs),
    ]
