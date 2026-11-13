// Independently authenticate source instruction metadata against the native CPU decoder.
// c++ -O2 -std=c++20 -I NESLE/cpp/include native-source-decode.cpp -o BIN
// BIN ROM PC_LIST (one decimal source-instruction PC per line). Emits mnemonic tuples, not ROM bytes.
#include "nesle/cpu.hpp"
#include <fstream>
#include <iostream>
#include <iterator>
#include <string>
#include <vector>
const char* names[]={"Illegal","LDA","LDX","LDY","STA","STX","STY","TAX","TAY","TXA","TYA","TSX","TXS","PHA","PHP","PLA","PLP","ORA","AND","EOR","ADC","SBC","CMP","CPX","CPY","BIT","INC","DEC","INX","INY","DEX","DEY","ASL","LSR","ROL","ROR","JMP","JSR","RTS","RTI","BRK","Branch","CLC","SEC","CLI","SEI","CLV","CLD","SED","NOP"};
const char* modes[]={"imp","acc","imm","zp","zpx","zpy","abs","absx","absy","indx","indy","ind","rel"};
int main(int argc,char** argv){
 if(argc!=3)return 2;std::ifstream file(argv[1],std::ios::binary),pcs(argv[2]);const std::vector<unsigned char> rom((std::istreambuf_iterator<char>(file)),{});if(rom.size()!=16+32768+8192)return 3;
 const auto byte=[&](unsigned address){return rom.at(16+((address-0x8000)&0x7fff));};std::cout<<'[';bool comma=false;unsigned pc;
 while(pcs>>pc){const auto opcode=byte(pc);const auto d=nesle::cpu::detail::decode(opcode);const int mode=int(d.mode),size=mode<2?1:mode==6||mode==7||mode==8||mode==11?3:2;unsigned operand=size==1?0:byte(pc+1);if(size==3)operand|=byte(pc+2)<<8;std::string name=names[int(d.op)];if(name=="Branch"){const char* branch[]={"BPL","BMI","BVC","BVS","BCC","BCS","BNE","BEQ"};name=branch[(opcode>>5)&7];operand=(pc+2+static_cast<signed char>(operand))&65535;}
  if(comma)std::cout<<',';comma=true;std::cout<<'['<<pc<<",\""<<name<<"\",\""<<modes[mode]<<"\","<<operand<<','<<size<<','<<+d.base_cycles<<','<<(d.flags&1)<<']';
 }
 std::cout<<"]\n";
}
