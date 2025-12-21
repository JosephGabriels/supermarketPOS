from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0004_add_etims_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='sale',
            name='etims_qr_image',
            field=models.TextField(blank=True, null=True),
        ),
    ]
