from django.db import models

class TestModel(models.Model):
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

# ---------------------------------------------------------------------------------- #

#			TUTORIAL

# MODELO PRINCIPAL: Proyecto
class Proyecto(models.Model):
    nombre = models.CharField(max_length=100)

    def __str__(self):
        return self.nombre

# RELACIÓN UNO A MUCHOS: Un Proyecto tiene múltiples Tareas
class Tarea(models.Model):
    proyecto = models.ForeignKey(Proyecto, on_delete=models.CASCADE, related_name="tareas")
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField()

    def __str__(self):
        return f"{self.nombre} en {self.proyecto.nombre}"

# RELACIÓN UNO A UNO: Cada Proyecto tiene un Cliente único
class Cliente(models.Model):
    proyecto = models.OneToOneField(Proyecto, on_delete=models.CASCADE, related_name="cliente")
    nombre = models.CharField(max_length=100)
    correo = models.EmailField()

    def __str__(self):
        return f"Cliente {self.nombre} para {self.proyecto.nombre}"

# RELACIÓN MUCHOS A MUCHOS: Empleados asignados a múltiples Tareas
class Empleado(models.Model):
    nombre = models.CharField(max_length=100)
    correo = models.EmailField(unique=True)
    tareas = models.ManyToManyField(Tarea, related_name="empleados")

    def __str__(self):
        return self.nombre

# Proyecto: Este es el modelo principal, que representa un proyecto en la empresa.


# Tarea:
# 	Relación Uno a Muchos con Proyecto: Cada proyecto tiene varias tareas, pero cada tarea solo pertenece a un proyecto.
# 	related_name="tareas" permite acceder a las tareas de un proyecto desde proyecto.tareas.


# Cliente:
# 	Relación Uno a Uno con Proyecto: Cada proyecto tiene un único cliente.
# 	related_name="cliente" permite acceder al cliente de un proyecto desde proyecto.cliente.


# Empleado:
# 	Relación Muchos a Muchos con Tarea: Un empleado puede estar asignado a varias tareas, y cada tarea puede tener múltiples empleados.
# 	related_name="empleados" permite acceder a los empleados de una tarea desde tarea.empleados.

# ---------------------------------------------------------------------------------- #

# Crear un Proyecto y su Cliente
# 	proyecto = Proyecto.objects.create(nombre="Desarrollo Web")
# 	cliente = Cliente.objects.create(proyecto=proyecto, nombre="Carlos", correo="carlos@cliente.com")
# 	print(proyecto.cliente.nombre)

#	# Salida: Carlos

# ---------------------------------------------------------------------------------- #

# Crear Tareas para el Proyecto (Uno a Muchos)
# 	tarea1 = Tarea.objects.create(proyecto=proyecto, nombre="Diseño de interfaz", descripcion="Diseñar el UI/UX del sitio")
# 	tarea2 = Tarea.objects.create(proyecto=proyecto, nombre="Desarrollo frontend", descripcion="Programar el frontend en React")

# 	for tarea in proyecto.tareas.all():
# 	    print(tarea.nombre)

# 	# Salida:
# 	# Diseño de interfaz
# 	# Desarrollo frontend

# ---------------------------------------------------------------------------------- #

# Crear Empleados y Asignarlos a Tareas (Muchos a Muchos)
# 	empleado1 = Empleado.objects.create(nombre="Ana", correo="ana@empresa.com")
# 	empleado2 = Empleado.objects.create(nombre="Luis", correo="luis@empresa.com")

# 	tarea1.empleados.add(empleado1, empleado2)  # Ambos empleados están en "Diseño de interfaz"
# 	tarea2.empleados.add(empleado1)             # Solo Ana está en "Desarrollo frontend"

# 	for empleado in tarea1.empleados.all():
# 	    print(empleado.nombre)

# 	# Salida:
# 	# Ana
# 	# Luis

#	for tarea in empleado1.tareas.all():
#	    print(tarea.nombre)

# 	# Salida:
# 	# Diseño de interfaz
# 	# Desarrollo frontend