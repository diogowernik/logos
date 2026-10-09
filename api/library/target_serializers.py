from rest_framework import serializers


class ImportTargetSerializer(serializers.Serializer):
    group = serializers.IntegerField(min_value=1, required=False)
    new_group_name = serializers.CharField(max_length=250, required=False)
    operation_id = serializers.UUIDField(required=False)
    group_state = serializers.RegexField(r"^[a-f0-9]{64}$")
    mode = serializers.ChoiceField(choices=["append", "replace"], required=False)
    confirm_existing = serializers.BooleanField(default=False)

    def validate(self, data):
        if data.get("group"):
            if data.get("new_group_name") or data.get("operation_id"):
                raise serializers.ValidationError("Escolha grupo existente ou novo, não os dois.")
        elif not data.get("new_group_name") or not data.get("operation_id"):
            raise serializers.ValidationError(
                "Informe o nome do novo grupo e a identificação da operação."
            )
        return data
