/// Khớp HairstyleCatalog bên backend.
class Hairstyle {
  final int id;
  final String name;
  final String? description;
  final String imageUrl;
  final String? tag;
  final bool premiumOnly;
  final int? ailabHairType;
  final String? ailabProStyle;

  Hairstyle({
    required this.id,
    required this.name,
    required this.imageUrl,
    this.description,
    this.tag,
    this.premiumOnly = false,
    this.ailabHairType,
    this.ailabProStyle,
  });

  factory Hairstyle.fromJson(Map<String, dynamic> json) => Hairstyle(
        id: json['id'] as int,
        name: json['name'] as String,
        imageUrl: json['imageUrl'] as String,
        description: json['description'] as String?,
        tag: json['tag'] as String?,
        premiumOnly: json['premiumOnly'] as bool? ?? false,
        ailabHairType: json['ailabHairType'] as int?,
        ailabProStyle: json['ailabProStyle'] as String?,
      );
}
