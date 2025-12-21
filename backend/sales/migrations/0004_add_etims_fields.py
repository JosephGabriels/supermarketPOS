from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0003_alter_sale_branch'),
    ]

    operations = [
        migrations.AddField(
            model_name='sale',
            name='etims_response',
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='sale',
            name='rcpt_signature',
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='sale',
            name='etims_qr',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='sale',
            name='etims_submitted',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='sale',
            name='etims_submitted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
