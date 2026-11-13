// Controlled INPUT branches of the authenticated power-on replay. No RAM or ROM writes.
// c++ -O2 -std=c++20 -ffp-contract=off -I LAB/rl/csrc -I LAB/.cache/nesle-src/cpp/include \
// tools/harness/native-player-resume-probe.cpp LAB/.cache/nesle-src/cpp/src/rom.cpp -o /tmp/native-player-resume-probe
// ROM PADS EXPECTED_RAM PICKUP_ROW LAST_ROW OUT_DIRECTORY
#include "rlenv_build.hpp"
#include <filesystem>
#include <fstream>
#include <iostream>
#include <iterator>
#include <string>
std::vector<std::uint8_t> readBytes(const char* p){std::ifstream in(p,std::ios::binary);if(!in)throw std::runtime_error(p);return {(std::istreambuf_iterator<char>(in)),{}};}
int main(int argc,char** argv){try{
 if(argc!=7)throw std::runtime_error("ROM PADS EXPECTED_RAM PICKUP_ROW LAST_ROW OUT_DIRECTORY");
 const auto rom=readBytes(argv[1]),pads=readBytes(argv[2]);const auto pickup=std::stoull(argv[4]),last=std::stoull(argv[5]);if(pickup>last||last>=pads.size())throw std::runtime_error("Invalid window");
 std::ifstream expected(argv[3],std::ios::binary);if(!expected)throw std::runtime_error("Expected native RAM required");std::filesystem::create_directories(argv[6]);
 rle::HostMachine machine(rom);if(machine.mode!=0)throw std::runtime_error("SMB NROM required");std::vector<std::vector<std::uint8_t>> saved;std::uint64_t savedTarget=0;std::uint8_t reference[2048];
 for(std::size_t f=0;f<=last;++f){
  if(f==pickup){saved=machine.arrays;savedTarget=machine.target;}
  if(machine.frame(pads[f]))throw std::runtime_error("CPU fault");expected.read(reinterpret_cast<char*>(reference),2048);
  if(!expected||std::memcmp(reference,machine.b.cpu.ram,2048))throw std::runtime_error("Native prefix mismatch row"+std::to_string(f));
 }
 std::cout<<"{\"verifiedBaselineRows\":"<<last+1<<",\"pickup\":"<<pickup<<",\"last\":"<<last<<",\"branches\":[";bool first=true;
 for(const auto& branch:std::vector<std::string>{"recorded","a-held","a-repress-during-freeze","a-released","b-press-during-freeze","left-no-a","right-no-a"}){
  for(std::size_t i=0;i<saved.size();++i)std::memcpy(machine.arrays[i].data(),saved[i].data(),saved[i].size());machine.target=savedTarget;
  const auto root=std::filesystem::path(argv[6])/branch;std::filesystem::create_directories(root);std::ofstream ram(root/"ram.bin",std::ios::binary),outPads(root/"pads.bin",std::ios::binary);bool transformed=false,controlled=false;std::size_t controlRow=0;
  for(std::size_t f=pickup;f<=last;++f){
   auto pad=pads[f];const auto engine=machine.b.cpu.ram[14];const bool control=transformed&&engine==8&&!controlled;
   if(f==pickup){if(branch=="a-repress-during-freeze"||branch=="a-released"||branch=="left-no-a"||branch=="right-no-a")pad&=~1;if(branch=="b-press-during-freeze")pad&=~2;}
   else if(transformed&&!controlled){if(branch=="a-repress-during-freeze"||branch=="a-held")pad|=1;if(branch=="a-released"||branch=="left-no-a"||branch=="right-no-a")pad&=~1;if(branch=="b-press-during-freeze")pad|=2;}
   if(control){controlled=true;controlRow=f;if(branch=="left-no-a")pad=(pad&~(1|128))|64;if(branch=="right-no-a")pad=(pad&~(1|64))|128;}
   if(machine.frame(pad))throw std::runtime_error("Branch CPU fault");const auto* r=machine.b.cpu.ram;if(r[14]==9||r[14]==12)transformed=true;
   ram.write(reinterpret_cast<const char*>(r),2048);outPads.put(static_cast<char>(pad));
  }
  if(!transformed||!controlled)throw std::runtime_error("Branch did not collect and resume: "+branch);
  if(!first)std::cout<<',';first=false;std::cout<<"{\"name\":\""<<branch<<"\",\"firstControllerRow\":"<<controlRow<<"}";
 }
 std::cout<<"]}\n";return 0;
}catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 1;}}
