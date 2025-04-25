from django.db import models

# Create your models here.
class Basic_state(models.Model):
    state_code = models.IntegerField(primary_key=True)
    state_name = models.CharField(max_length=40)

    def __str__(self):
        return f"{self.state_name}"

class Basic_district(models.Model):
    district_code = models.IntegerField(primary_key=True)
    district_name = models.CharField(max_length=40)
    state_code = models.ForeignKey(Basic_state, to_field='state_code', on_delete=models.CASCADE)
    
    def __str__(self):
        return f"{self.district_name}"

class Basic_subdistrict(models.Model):
    subdistrict_code = models.IntegerField(primary_key=True)
    subdistrict_name = models.CharField(max_length=40)
    district_code = models.ForeignKey(Basic_district, to_field='district_code', on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.subdistrict_name}"

class Basic_village(models.Model):
    village_code = models.IntegerField(primary_key=True)
    village_name = models.CharField(max_length=100)
    population_2011 = models.IntegerField()
    subdistrict_code = models.ForeignKey(Basic_subdistrict, to_field='subdistrict_code', on_delete=models.CASCADE)
    
    def __str__(self):
        return f"{self.village_name} ({self.population_2011})"
    
class Population_2011(models.Model):
       subdistrict_code = models.IntegerField(primary_key=True)
       region_name = models.CharField(max_length=40)
       population_1951 = models.BigIntegerField()
       population_1961 = models.BigIntegerField()
       population_1971 = models.BigIntegerField()
       population_1981 = models.BigIntegerField()
       population_1991 = models.BigIntegerField()
       population_2001 = models.BigIntegerField()
       population_2011 = models.BigIntegerField()

       def __str__(self):
           return f"{self.region_name},{self.subdistrict_code},{self.population_1951},{self.population_1961},{self.population_1971},{self.population_1981},{self.population_1991},{self.population_2001},{self.population_2011}"




class PopulationCohort(models.Model):
    """
    Model to store population cohort data by age group across different years.
    """
    age_group = models.CharField(max_length=10)
    
    # 2011 data
    # Using field_name syntax but db_column to match exact CSV column names
    person_2011 = models.CharField(db_column='2011_Person', max_length=20, null=True)
    male_2011 = models.CharField(db_column='2011_Male', max_length=20, null=True)
    female_2011 = models.CharField(db_column='2011_Female', max_length=20, null=True)
    
    # 2016 data
    person_2016 = models.CharField(db_column='2016_Person', max_length=20, null=True)
    male_2016 = models.IntegerField(db_column='2016_Male', null=True)  # This field is already numeric in the CSV
    female_2016 = models.CharField(db_column='2016_Female', max_length=20, null=True)
    
    # 2021 data
    person_2021 = models.CharField(db_column='2021_Person', max_length=20, null=True)
    male_2021 = models.CharField(db_column='2021_Male', max_length=20, null=True)
    female_2021 = models.CharField(db_column='2021_Female', max_length=20, null=True)
    
    # 2026 data
    person_2026 = models.CharField(db_column='2026_Person', max_length=20, null=True)
    male_2026 = models.CharField(db_column='2026_Male', max_length=20, null=True)
    female_2026 = models.CharField(db_column='2026_Female', max_length=20, null=True)
    
    # 2031 data
    person_2031 = models.CharField(db_column='2031_Person', max_length=20, null=True)
    male_2031 = models.IntegerField(db_column='2031_Male', null=True)  # This field is already numeric in the CSV
    female_2031 = models.CharField(db_column='2031_Female', max_length=20, null=True)
    
    # 2036 data
    person_2036 = models.CharField(db_column='2036_Person', max_length=20, null=True)
    male_2036 = models.CharField(db_column='2036_Male', max_length=20, null=True)
    female_2036 = models.CharField(db_column='2036_Female', max_length=20, null=True)
    
    class Meta:
        db_table = 'population_cohort'
        verbose_name = "Population Cohort"
        verbose_name_plural = "Population Cohorts"
    
    def __str__(self):
        return f"Age Group: {self.age_group}"