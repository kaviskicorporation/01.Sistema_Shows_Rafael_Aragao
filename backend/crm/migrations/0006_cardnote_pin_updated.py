from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("crm", "0005_cardnote"),
    ]

    operations = [
        migrations.AddField(
            model_name="cardnote",
            name="pinned",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="cardnote",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AlterModelOptions(
            name="cardnote",
            options={"ordering": ["-pinned", "-created_at"]},
        ),
    ]
