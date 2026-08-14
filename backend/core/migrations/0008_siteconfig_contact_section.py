from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0007_siteconfig_agenda_list_page_size"),
    ]

    operations = [
        migrations.AddField(
            model_name="siteconfig",
            name="contact_eyebrow",
            field=models.CharField(default="Contratação", max_length=80),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="contact_title_line1",
            field=models.CharField(default="FAÇA SEU EVENTO", max_length=120),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="contact_title_line2",
            field=models.CharField(default="CORPORATIVO", max_length=120),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="contact_scroll_hint",
            field=models.CharField(
                default="Role para revelar o formulário", max_length=160
            ),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="contact_bg_image",
            field=models.ImageField(
                blank=True, null=True, upload_to="site/"
            ),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="contact_bg_image_url",
            field=models.CharField(
                blank=True,
                default="/images/rei-dos-peao.png",
                max_length=500,
            ),
        ),
    ]
