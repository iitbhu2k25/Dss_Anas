# Generated by Django 5.1.6 on 2025-04-25 07:11

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Basic_state",
            fields=[
                ("state_code", models.IntegerField(primary_key=True, serialize=False)),
                ("state_name", models.CharField(max_length=40)),
            ],
        ),
        migrations.CreateModel(
            name="Population_2011",
            fields=[
                (
                    "subdistrict_code",
                    models.IntegerField(primary_key=True, serialize=False),
                ),
                ("region_name", models.CharField(max_length=40)),
                ("population_1951", models.BigIntegerField()),
                ("population_1961", models.BigIntegerField()),
                ("population_1971", models.BigIntegerField()),
                ("population_1981", models.BigIntegerField()),
                ("population_1991", models.BigIntegerField()),
                ("population_2001", models.BigIntegerField()),
                ("population_2011", models.BigIntegerField()),
            ],
        ),
        migrations.CreateModel(
            name="PopulationCohort",
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
                ("age_group", models.CharField(max_length=10)),
                (
                    "person_2011",
                    models.CharField(db_column="2011_Person", max_length=20, null=True),
                ),
                (
                    "male_2011",
                    models.CharField(db_column="2011_Male", max_length=20, null=True),
                ),
                (
                    "female_2011",
                    models.CharField(db_column="2011_Female", max_length=20, null=True),
                ),
                (
                    "person_2016",
                    models.CharField(db_column="2016_Person", max_length=20, null=True),
                ),
                ("male_2016", models.IntegerField(db_column="2016_Male", null=True)),
                (
                    "female_2016",
                    models.CharField(db_column="2016_Female", max_length=20, null=True),
                ),
                (
                    "person_2021",
                    models.CharField(db_column="2021_Person", max_length=20, null=True),
                ),
                (
                    "male_2021",
                    models.CharField(db_column="2021_Male", max_length=20, null=True),
                ),
                (
                    "female_2021",
                    models.CharField(db_column="2021_Female", max_length=20, null=True),
                ),
                (
                    "person_2026",
                    models.CharField(db_column="2026_Person", max_length=20, null=True),
                ),
                (
                    "male_2026",
                    models.CharField(db_column="2026_Male", max_length=20, null=True),
                ),
                (
                    "female_2026",
                    models.CharField(db_column="2026_Female", max_length=20, null=True),
                ),
                (
                    "person_2031",
                    models.CharField(db_column="2031_Person", max_length=20, null=True),
                ),
                ("male_2031", models.IntegerField(db_column="2031_Male", null=True)),
                (
                    "female_2031",
                    models.CharField(db_column="2031_Female", max_length=20, null=True),
                ),
                (
                    "person_2036",
                    models.CharField(db_column="2036_Person", max_length=20, null=True),
                ),
                (
                    "male_2036",
                    models.CharField(db_column="2036_Male", max_length=20, null=True),
                ),
                (
                    "female_2036",
                    models.CharField(db_column="2036_Female", max_length=20, null=True),
                ),
            ],
            options={
                "verbose_name": "Population Cohort",
                "verbose_name_plural": "Population Cohorts",
                "db_table": "population_cohort",
            },
        ),
        migrations.CreateModel(
            name="Basic_district",
            fields=[
                (
                    "district_code",
                    models.IntegerField(primary_key=True, serialize=False),
                ),
                ("district_name", models.CharField(max_length=40)),
                (
                    "state_code",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="Basic.basic_state",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="Basic_subdistrict",
            fields=[
                (
                    "subdistrict_code",
                    models.IntegerField(primary_key=True, serialize=False),
                ),
                ("subdistrict_name", models.CharField(max_length=40)),
                (
                    "district_code",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="Basic.basic_district",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="Basic_village",
            fields=[
                (
                    "village_code",
                    models.IntegerField(primary_key=True, serialize=False),
                ),
                ("village_name", models.CharField(max_length=100)),
                ("population_2011", models.IntegerField()),
                (
                    "subdistrict_code",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="Basic.basic_subdistrict",
                    ),
                ),
            ],
        ),
    ]
