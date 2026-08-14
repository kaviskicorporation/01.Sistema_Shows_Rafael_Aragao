from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("crm", "0002_user_perms_and_demo"),
    ]

    operations = [
        migrations.AlterField(
            model_name="lead",
            name="category",
            field=models.CharField(default="corporativo", max_length=80),
        ),
        migrations.AddField(
            model_name="lead",
            name="extra_fields",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
