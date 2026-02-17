from django.http import JsonResponse

# Create your views here.
def home(request):
    data = {
        'message': 'Welcome to the Smiley Page Corner!'
    }
    return JsonResponse(data)